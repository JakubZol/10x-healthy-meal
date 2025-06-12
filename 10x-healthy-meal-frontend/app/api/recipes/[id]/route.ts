import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, throwNotFoundError } from '@/lib/errorHandler';
import { validatePathParam, validateRequestBody, updateRecipeSchema } from '@/lib/validation';
import { RecipeService } from '@/services/recipeService';
import { UpdateRecipeCommand } from '@/types';
import { createClient } from "@/lib/supabase/server";

async function handleGetRecipe(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Authenticate the user
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (user?.data?.user) {
    // Validate the recipe ID parameter
    const recipeId = validatePathParam(params.id, 'recipe ID');

    // Get the recipe using the service
    const recipeService = new RecipeService();
    const recipe = await recipeService.getRecipeById(user?.data?.user?.id, recipeId);

    if (!recipe) {
      throwNotFoundError('Recipe');
    }

    // Return the recipe
    return NextResponse.json(recipe, {status: 200});
  } else {
    return NextResponse.json(
        { error: 'Brak dostępu.' },
        { status: 401 }
    );
  }
}

async function handleDeleteRecipe(
    request: NextRequest,
    { params }: { params: { id: string }}
): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    if (user?.data?.user) {
      // Validate the recipe ID parameter
      const recipeId = validatePathParam(params.id, 'recipe ID');

      const recipeService = new RecipeService();
      const recipe = await recipeService.deleteRecipe(user?.data?.user?.id, recipeId);

      return new NextResponse(null, {status: 204});
    } else {
      return NextResponse.json(
          { error: 'Brak dostępu.' },
          { status: 401 }
      );
    }
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Authentication')) {
      return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
      );
    }

    if (errorMessage.startsWith('VALIDATION_ERROR')) {
      return NextResponse.json(
          { error: errorMessage.replace('VALIDATION_ERROR: ', '') },
          { status: 400 }
      );
    }

    if (errorMessage === 'RECIPE_NOT_FOUND') {
      return NextResponse.json(
          { error: 'Recipe record not found' },
          { status: 404 }
      );
    }

    if (errorMessage === 'UNAUTHORIZED_ACCESS') {
      return NextResponse.json(
          { error: 'You do not have permission to delete this recipe record' },
          { status: 403 }
      );
    }

    if (errorMessage.startsWith('DATABASE_ERROR')) {
      console.error('Database error in recipe deletion:', errorMessage);
      return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
      );
    }

    // Generic error fallback
    console.error('Unexpected error in recipe deletion:', error);
    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
    );
  }


}

async function handleUpdateRecipe(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // Authenticate the user

  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  // Validate the recipe ID parameter
  const recipeId = validatePathParam(params.id, 'recipe ID');

  if (user?.data?.user) {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = validateRequestBody(updateRecipeSchema, body) as UpdateRecipeCommand;

    // Update the recipe using the service
    const recipeService = new RecipeService();
    const updatedRecipe = await recipeService.updateRecipe(user?.data?.user?.id, recipeId, validatedData);

    if (!updatedRecipe) {
      throwNotFoundError('Recipe');
    }

    // Return the updated recipe
    return NextResponse.json(updatedRecipe, {status: 200});
  } else {
    return NextResponse.json(
        { error: 'Brak dostępu.' },
        { status: 401 }
    );
  }
}

// Export the handlers with error handling
export const GET = withErrorHandler(handleGetRecipe);
export const PUT = withErrorHandler(handleUpdateRecipe);
export const DELETE = withErrorHandler(handleDeleteRecipe);
