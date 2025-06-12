import { NextRequest, NextResponse } from 'next/server';
import { GenerationService } from '@/services/generationService';
import { withErrorHandler } from '@/lib/errorHandler';
import { generateRecipeSchema, validateRequestBody } from '@/lib/validation';
import { createClient } from "@/lib/supabase/server";

// POST /api/recipes/generate - Generate modified recipe using AI
export const POST = withErrorHandler(async (request: NextRequest) => {
  try {
    // Authenticate the user
    //const userContext = await requireAuth(request);
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (user?.data?.user) {
      // Parse and validate request body
      const body = await request.json();
      const validatedData = validateRequestBody(generateRecipeSchema, body);

      // Generate the recipe using AI
      const generationService = new GenerationService();
      const generatedRecipe = await generationService.generateRecipe(user?.data?.user?.id, validatedData);

      return NextResponse.json(generatedRecipe, {status: 200});
    } else {
      return NextResponse.json(
          { error: 'Brak dostępu.' },
          { status: 401 }
      );
    }

  } catch (error) {
    const errorMessage = (error as Error).message;

    // Handle specific error types with appropriate HTTP status codes
    if (errorMessage.includes('Authentication')) {
      return NextResponse.json(
        { error: 'Brak dostępu.' },
        { status: 401 }
      );
    }

    if (errorMessage.startsWith('VALIDATION_ERROR')) {
      return NextResponse.json(
        { error: errorMessage.replace('VALIDATION_ERROR: ', '') },
        { status: 422 }
      );
    }

    if (errorMessage === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'Timeout - AI przekroczyło maksymalny czas na odpowiedź.' },
        { status: 408 }
      );
    }

    if (errorMessage.startsWith('AI_SERVICE_ERROR')) {
      return NextResponse.json(
        { error: 'Wystąpił problem podczas modyfikacji twojego przepisu, spróbuj ponownie' },
        { status: 503 }
      );
    }

    if (errorMessage.startsWith('DATABASE_ERROR')) {
      console.error('Database error in recipe generation:', errorMessage);
      return NextResponse.json(
        { error: 'Błąd serwera.' },
        { status: 500 }
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Niepoprawne dane.' },
        { status: 400 }
      );
    }

    // Generic error fallback
    console.error('Unexpected error in recipe generation:', error);
    return NextResponse.json(
      { error: 'Błąd serwera.' },
      { status: 500 }
    );
  }
});
