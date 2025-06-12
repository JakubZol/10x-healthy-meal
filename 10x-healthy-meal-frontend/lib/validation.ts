import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid UUID format');

// Profile validation schemas
export const createProfileSchema = z.object({
  preferences: z.string()
    .min(1, 'Preferences cannot be empty')
    .max(1000, 'Preferences must not exceed 1000 characters'),
});

export const updateProfileSchema = z.object({
  preferences: z.string()
    .min(1, 'Preferences cannot be empty')
    .max(1000, 'Preferences must not exceed 1000 characters'),
});

// Recipe generation validation schema
export const generateRecipeSchema = z.object({
  original_text: z.string()
    .min(1, 'Original text is required')
    .max(10000, 'Original text must not exceed 10000 characters'),
  modification_prompt: z.string()
    .min(1, 'Modification prompt is required')
    .max(500, 'Modification prompt must not exceed 500 characters'),
});

// Generation ID parameter validation schema
export const generationIdSchema = uuidSchema;

// Recipe creation validation schema
export const createRecipeSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must not exceed 100 characters'),
  original_text: z.string()
    .min(1, 'Original text is required')
    .max(10000, 'Original text must not exceed 10000 characters'),
  modification_prompt: z.string()
    .min(1, 'Modification prompt is required')
    .max(500, 'Modification prompt must not exceed 500 characters'),
  modified_text: z.string()
    .min(1, 'Modified text is required')
    .max(10000, 'Modified text must not exceed 10000 characters'),
  generation_id: uuidSchema,
});

// Recipe update validation schema (all fields optional)
export const updateRecipeSchema = z.object({
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(100, 'Title must not exceed 100 characters')
    .optional(),
  original_text: z.string()
    .min(1, 'Original text cannot be empty')
    .max(10000, 'Original text must not exceed 10000 characters')
    .optional(),
  modification_prompt: z.string()
    .min(1, 'Modification prompt cannot be empty')
    .max(500, 'Modification prompt must not exceed 500 characters')
    .optional(),
  modified_text: z.string()
    .min(1, 'Modified text cannot be empty')
    .max(10000, 'Modified text must not exceed 10000 characters')
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Recipe list query parameters validation schema
export const recipeListQuerySchema = z.object({
  page: z.coerce.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .default(20),
  sort_by: z.enum(['created_at', 'title'])
    .default('created_at'),
  order: z.enum(['asc', 'desc'])
    .default('desc'),
});

// Recipe ID parameter validation schema
export const recipeIdSchema = uuidSchema;

// Helper function to validate request body
export function validateRequestBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new Error(`VALIDATION_ERROR: ${errorMessage}`);
    }
    throw error;
  }
}

// Helper function to validate query parameters
export function validateQueryParams<T>(schema: z.ZodSchema<T>, params: Record<string, string | string[] | undefined>): T {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new Error(`VALIDATION_ERROR: ${errorMessage}`);
    }
    throw error;
  }
}

// Helper function to validate path parameters
export function validatePathParam(value: string, paramName: string): string {
  try {
    return uuidSchema.parse(value);
  } catch (error) {
    throw new Error(`VALIDATION_ERROR: ${paramName} must be a valid UUID`);
  }
}
