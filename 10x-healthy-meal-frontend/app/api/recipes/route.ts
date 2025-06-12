import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/errorHandler';
import { validateRequestBody, createRecipeSchema, validateQueryParams, recipeListQuerySchema } from '@/lib/validation';
import { RecipeService } from '@/services/recipeService';
import { CreateRecipeCommand } from '@/types';
import { createClient } from "@/lib/supabase/server";

async function handleCreateRecipe(request: NextRequest): Promise<NextResponse> {
  // Authenticate the user
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (user?.data?.user) {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = validateRequestBody(createRecipeSchema, body) as CreateRecipeCommand;

    // Create the recipe using the service
    const recipeService = new RecipeService();
    const createdRecipe = await recipeService.createRecipe(user?.data?.user?.id, validatedData);

    // Return the created recipe
    return NextResponse.json(createdRecipe, {status: 201});
  } else {
    return NextResponse.json(
        { error: 'Brak dostępu.' },
        { status: 401 }
    );
  }
}

async function handleListRecipes(request: NextRequest): Promise<NextResponse> {
  // Authenticate the user
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  if (user?.data?.user) {
    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedParams = validateQueryParams(recipeListQuerySchema, queryParams);

    // List recipes using the service
    const recipeService = new RecipeService();
    const recipeList = await recipeService.listRecipes(user?.data?.user?.id, {
      page: validatedParams.page ?? 1,
      limit: validatedParams.limit ?? 20,
      sortBy: validatedParams.sort_by ?? 'created_at',
      order: validatedParams.order ?? 'desc',
    });

    // Return the recipe list
    return NextResponse.json(recipeList, {status: 200});
  } else {
    return NextResponse.json(
        { error: 'Brak dostępu.' },
        { status: 401 }
    );
  }
}

// Export the handlers with error handling
export const POST = withErrorHandler(handleCreateRecipe);
export const GET = withErrorHandler(handleListRecipes);
