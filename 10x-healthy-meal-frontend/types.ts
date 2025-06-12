import type { Tables } from './db/database.types';

// --- Base Database Row Types ---

/**
 * Base row type for the 'profiles' table from the database.
 */
type ProfileRow = Tables<'profiles'>;

/**
 * Base row type for the 'recipes' table from the database.
 */
type RecipeRow = Tables<'recipes'>;

/**
 * Base row type for the 'generations' table from the database.
 */
type GenerationRow = Tables<'generations'>;

// --- Profile DTOs and Commands ---

/**
 * DTO for user profile data.
 * Represents the response for GET /profiles/me, POST /profiles/me, and PUT /profiles/me.
 * Directly maps to ProfileRow, which includes id, user_id, preferences, created_at, modified_at.
 */
export type ProfileDto = ProfileRow;

/**
 * Command model for creating a user profile.
 * Represents the request body for POST /profiles/me.
 */
export type CreateProfileCommand = Pick<ProfileRow, 'preferences'>;

/**
 * Command model for updating a user profile.
 * Represents the request body for PUT /profiles/me.
 */
export type UpdateProfileCommand = Pick<ProfileRow, 'preferences'>;

// --- Recipe Generation DTOs and Commands ---

/**
 * Command model for generating a new recipe via AI.
 * Represents the request body for POST /recipes/generate.
 */
export type GenerateRecipeCommand = Pick<RecipeRow, 'original_text' | 'modification_prompt'>;

/**
 * DTO for the result of an AI recipe generation.
 * Represents the response body for POST /recipes/generate.
 * Combines fields related to recipe content and the generation event.
 */
export type GeneratedRecipeDto = {
  original_text: RecipeRow['original_text'];
  modification_prompt: RecipeRow['modification_prompt'];
  modified_text: RecipeRow['modified_text'];
  generation_id: GenerationRow['id'];
  /** Timestamp of when the generation occurred, derived from GenerationRow.created_at */
  generated_at: GenerationRow['created_at'];
};

// --- Recipe DTOs and Commands ---

/**
 * Command model for creating/saving a new recipe.
 * Represents the request body for POST /recipes.
 * All fields are required for creating a new recipe.
 */
export type CreateRecipeCommand = Pick<
  RecipeRow,
  'title' | 'original_text' | 'modification_prompt' | 'modified_text' | 'generation_id'
>;

/**
 * DTO for full recipe data.
 * Represents the response for POST /recipes, GET /recipes/{id}, and PUT /recipes/{id}.
 * Directly maps to RecipeRow.
 */
export type RecipeDto = RecipeRow;

/**
 * DTO for a recipe item in a list.
 * Represents an item in the 'data' array for GET /recipes response.
 */
export type RecipeListItemDto = Pick<RecipeRow, 'id' | 'title' | 'created_at'>;

/**
 * DTO for pagination metadata.
 * Used in list responses, e.g., GET /recipes.
 * Matches the structure defined in the API plan.
 */
export type PaginationDto = {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
};

/**
 * DTO for a list of recipes with pagination.
 * Represents the response body for GET /recipes.
 */
export type RecipeListDto = {
  data: RecipeListItemDto[];
  pagination: PaginationDto;
};

/**
 * Command model for updating an existing recipe.
 * Represents the request body for PUT /recipes/{id}.
 * All fields are optional for an update.
 */
export type UpdateRecipeCommand = Partial<
  Pick<RecipeRow, 'title' | 'original_text' | 'modification_prompt' | 'modified_text'>
>;

// --- Common Identifier Types (Optional, for clarity if needed elsewhere) ---

/**
 * Represents a UUID, typically a string.
 * This is implicitly handled by the string types from Supabase generated types for UUID columns.
 */
// export type Uuid = string; // Not strictly needed as base types already use string for UUIDs.
