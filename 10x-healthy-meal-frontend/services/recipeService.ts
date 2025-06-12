import { createClient } from '@/lib/supabase/server';
import type {
  CreateRecipeCommand,
  UpdateRecipeCommand,
  RecipeDto,
  RecipeListDto,
  RecipeListItemDto,
  PaginationDto
} from '@/types';

export class RecipeService {
  /**
   * Creates a new recipe for the authenticated user
   * @param userId - The authenticated user's ID
   * @param data - Recipe creation data
   * @returns Promise<RecipeDto> - The created recipe
   * @throws Error if generation_id doesn't exist or doesn't belong to user
   */
  async createRecipe(userId: string, data: CreateRecipeCommand): Promise<RecipeDto> {
    const supabase = await createClient();

    // First, verify that the generation_id exists and belongs to the user
    const { data: generation, error: generationError } = await supabase
      .from('generations')
      .select('id')
      .eq('id', data.generation_id)
      .eq('user_id', userId)
      .single();

    if (generationError || !generation) {
      throw new Error('GENERATION_NOT_FOUND_OR_UNAUTHORIZED');
    }

    // Insert the new recipe
    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert({
        user_id: userId,
        title: data.title,
        original_text: data.original_text,
        modification_prompt: data.modification_prompt,
        modified_text: data.modified_text,
        generation_id: data.generation_id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    return recipe as RecipeDto;
  }

  /**
   * Lists recipes for the authenticated user with pagination and sorting
   * @param userId - The authenticated user's ID
   * @param queryParams - Pagination and sorting parameters
   * @returns Promise<RecipeListDto> - List of recipes with pagination metadata
   */
  async listRecipes(
    userId: string,
    queryParams: { page: number; limit: number; sortBy: string; order: string }
  ): Promise<RecipeListDto> {
    const supabase = await createClient();
    const { page, limit, sortBy, order } = queryParams;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Map sortBy to actual column names for security
    const sortColumnMap: Record<string, string> = {
      'created_at': 'created_at',
      'title': 'title'
    };

    const sortColumn = sortColumnMap[sortBy] || 'created_at';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    // Get total count for pagination metadata
    const { count, error: countError } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      throw new Error(`DATABASE_ERROR: ${countError.message}`);
    }

    // Get paginated recipes
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order(sortColumn, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    // Calculate pagination metadata
    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    const pagination: PaginationDto = {
      current_page: page,
      per_page: limit,
      total_items: totalItems,
      total_pages: totalPages,
    };

    return {
      data: recipes as RecipeListItemDto[],
      pagination,
    };
  }

  /**
   * Gets a specific recipe by ID for the authenticated user
   * @param userId - The authenticated user's ID
   * @param recipeId - The recipe ID to retrieve
   * @returns Promise<RecipeDto | null> - The recipe or null if not found/unauthorized
   */
  async getRecipeById(userId: string, recipeId: string): Promise<RecipeDto | null> {
    const supabase = await createClient();

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    return recipe as RecipeDto;
  }

  /**
   * Updates an existing recipe for the authenticated user
   * @param userId - The authenticated user's ID
   * @param recipeId - The recipe ID to update
   * @param data - Recipe update data
   * @returns Promise<RecipeDto | null> - The updated recipe or null if not found/unauthorized
   */
  async updateRecipe(
    userId: string,
    recipeId: string,
    data: UpdateRecipeCommand
  ): Promise<RecipeDto | null> {
    const supabase = await createClient();

    // First verify the recipe exists and belongs to the user
    const existingRecipe = await this.getRecipeById(userId, recipeId);
    if (!existingRecipe) {
      return null;
    }

    // Update the recipe
    const { data: updatedRecipe, error } = await supabase
      .from('recipes')
      .update({
        title: data.title,
        original_text: data.original_text,
        modification_prompt: data.modification_prompt,
        modified_text: data.modified_text,
      })
      .eq('id', recipeId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    return updatedRecipe as RecipeDto;
  }

  /**
   * Deletes a recipe for the authenticated user
   * @param userId - The authenticated user's ID
   * @param recipeId - The recipe ID to delete
   * @returns Promise<boolean> - True if deleted successfully
   * @throws Error if recipe not found or unauthorized
   */
  async deleteRecipe(userId: string, recipeId: string): Promise<boolean> {
    const supabase = await createClient();

    // First verify the recipe exists and belongs to the user
    const existingRecipe = await this.getRecipeById(userId, recipeId);
    if (!existingRecipe) {
      throw new Error('RECIPE_NOT_FOUND_OR_UNAUTHORIZED');
    }

    // Delete the recipe
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`DATABASE_ERROR: ${error.message}`);
    }

    return true;
  }
}
