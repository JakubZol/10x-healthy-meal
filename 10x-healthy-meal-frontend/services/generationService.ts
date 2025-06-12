import { createClient } from '@/lib/supabase/server';
import type {
  GenerateRecipeCommand,
  GeneratedRecipeDto
} from '@/types';
import { createHash } from 'crypto';

export class GenerationService {

  /**
   * Generates a modified recipe using AI based on original text and modification prompt
   * @param userId - The authenticated user's ID
   * @param command - Recipe generation command data
   * @returns Promise<GeneratedRecipeDto> - The generated recipe with metadata
   * @throws Error for various failure scenarios (timeout, AI service error, etc.)
   */
  async generateRecipe(userId: string, command: GenerateRecipeCommand): Promise<GeneratedRecipeDto> {
    const supabase = await createClient();

    try {
      // Calculate source text hash and length for logging
      const sourceTextHash = this.calculateSourceTextHash(command.original_text, command.modification_prompt);
      const sourceTextLength = command.original_text.length + command.modification_prompt.length;

      // Call AI service with timeout
      const modifiedText = await this.callAIService(command.original_text, command.modification_prompt);

      // Save generation record to database
      const { data: generation, error } = await supabase
        .from('generations')
        .insert({
          user_id: userId,
          model: process.env.DEFAULT_AI_MODEL || 'openai/gpt-3.5-turbo',
          generated_count: 1,
          accepted_count: null,
          source_text_hash: sourceTextHash,
          source_text_length: sourceTextLength,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`DATABASE_ERROR: ${error.message}`);
      }

      // Return the generated recipe DTO
      return {
        original_text: command.original_text,
        modification_prompt: command.modification_prompt,
        modified_text: modifiedText,
        generation_id: generation.id,
        generated_at: generation.created_at,
      };

    } catch (error) {
      // Log error to generations_error_logs
      await this.logError(userId, error as Error, command);
      throw error;
    }
  }

  /**
   * Deletes a generation record for the authenticated user
   * @param userId - The authenticated user's ID
   * @param generationId - The generation ID to delete
   * @returns Promise<boolean> - True if successfully deleted
   * @throws Error for not found or unauthorized scenarios
   */
  async deleteGeneration(userId: string, generationId: string): Promise<boolean> {
    const supabase = await createClient();

    // First, verify the generation exists and belongs to the user
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('user_id')
      .eq('id', generationId)
      .single();

    if (fetchError || !generation) {
      throw new Error('GENERATION_NOT_FOUND');
    }

    if (generation.user_id !== userId) {
      throw new Error('UNAUTHORIZED_ACCESS');
    }

    // Delete the generation record
    const { error: deleteError } = await supabase
      .from('generations')
      .delete()
      .eq('id', generationId)
      .eq('user_id', userId); // Double-check ownership

    if (deleteError) {
      throw new Error(`DATABASE_ERROR: ${deleteError.message}`);
    }

    return true;
  }

  /**
   * Calls the AI service (Openrouter.ai) with timeout handling
   * @param originalText - The original recipe text
   * @param modificationPrompt - The modification instructions
   * @returns Promise<string> - The modified recipe text
   * @throws Error for timeout or AI service errors
   */
  private async callAIService(originalText: string, modificationPrompt: string): Promise<string> {
    const timeoutMs = parseInt(process.env.AI_GENERATION_TIMEOUT_MS || '10000');
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.DEFAULT_AI_MODEL || 'openai/gpt-3.5-turbo';

    if (!apiKey) {
      throw new Error('AI_SERVICE_ERROR: API key not configured');
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    });

    // Create AI API call promise
    const aiPromise = this.makeAIRequest(originalText, modificationPrompt, apiKey, model);

    try {
      // Race between AI call and timeout
      const result = await Promise.race([aiPromise, timeoutPromise]);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        throw new Error('TIMEOUT');
      }
      throw new Error(`AI_SERVICE_ERROR: ${(error as Error).message}`);
    }
  }

  /**
   * Makes the actual HTTP request to Openrouter.ai
   * @param originalText - The original recipe text
   * @param modificationPrompt - The modification instructions
   * @param apiKey - The Openrouter API key
   * @param model - The AI model to use
   * @returns Promise<string> - The modified recipe text
   */
  private async makeAIRequest(
    originalText: string,
    modificationPrompt: string,
    apiKey: string,
    model: string
  ): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000',
        'X-Title': '10x Healthy Meal Generator',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful cooking assistant. Modify the given recipe according to the user\'s instructions. Return only the modified recipe text without any additional commentary.'
          },
          {
            role: 'user',
            content: `Original recipe:\n${originalText}\n\nModification instructions:\n${modificationPrompt}\n\nPlease provide the modified recipe:`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from AI service');
    }

    return data.choices[0].message.content.trim();
  }

  /**
   * Calculates SHA256 hash of source text for logging purposes
   * @param originalText - The original recipe text
   * @param modificationPrompt - The modification instructions
   * @returns string - The calculated hash
   */
  private calculateSourceTextHash(originalText: string, modificationPrompt: string): string {
    const combinedText = originalText + modificationPrompt;
    return createHash('sha256').update(combinedText).digest('hex');
  }

  /**
   * Logs errors to the generations_error_logs table
   * @param userId - The user ID
   * @param error - The error that occurred
   * @param command - The original command that caused the error
   */
  private async logError(userId: string, error: Error, command: GenerateRecipeCommand): Promise<void> {
    try {
      const supabase = await createClient();

      let errorCode = 'UNKNOWN_ERROR';
      if (error.message === 'TIMEOUT') {
        errorCode = 'TIMEOUT';
      } else if (error.message.startsWith('AI_SERVICE_ERROR')) {
        errorCode = 'AI_SERVICE_ERROR';
      }

      await supabase
        .from('generations_error_logs')
        .insert({
          user_id: userId,
          error_code: errorCode,
          error_message: error.message,
          source_text_hash: this.calculateSourceTextHash(command.original_text, command.modification_prompt),
          source_text_length: command.original_text.length + command.modification_prompt.length,
        });
    } catch (logError) {
      // If logging fails, we don't want to throw - just log to console
      console.error('Failed to log error to database:', logError);
    }
  }
}
