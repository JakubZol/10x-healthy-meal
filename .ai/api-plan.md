# REST API Plan

## 1. Resources

-   **Profiles**: Manages user dietary preferences and settings.
    -   Corresponds to: `profiles` table.
-   **Recipes**: Manages user's saved recipes, including original and AI-modified versions.
    -   Corresponds to: `recipes` table.
-   **Recipe Generation**: Handles the AI-powered recipe modification process.
    -   Internally uses: `generations` and `generations_error_logs` tables for logging and tracking.

## 2. Endpoints

All endpoints are assumed to be prefixed with `/api`.

### 2.1. Profiles

#### GET /profiles/me
-   **Description**: Retrieve the current authenticated user's profile.
-   **HTTP Method**: `GET`
-   **URL Path**: `/profiles/me`
-   **Query Parameters**: None
-   **Request Body**: None
-   **Response Body**:
    ```json
    {
      "id": "uuid",
      "user_id": "uuid",
      "preferences": "string (max 1000 chars)",
      "created_at": "timestampz",
      "modified_at": "timestampz"
    }
    ```
-   **Success Codes**:
    -   `200 OK`: Profile retrieved successfully.
-   **Error Codes**:
    -   `401 Unauthorized`: Authentication token is missing or invalid.
    -   `404 Not Found`: Profile for the user does not exist.

#### POST /profiles/me
-   **Description**: Create a profile for the current authenticated user (e.g., on first preference save).
-   **HTTP Method**: `POST`
-   **URL Path**: `/profiles/me`
-   **Query Parameters**: None
-   **Request Body**:
    ```json
    {
      "preferences": "string (required, max 1000 chars)"
    }
    ```
-   **Response Body**:
    ```json
    {
      "id": "uuid",
      "user_id": "uuid",
      "preferences": "string",
      "created_at": "timestampz",
      "modified_at": "timestampz"
    }
    ```
-   **Success Codes**:
    -   `201 Created`: Profile created successfully.
-   **Error Codes**:
    -   `400 Bad Request`: Invalid request payload (e.g., missing `preferences`).
    -   `401 Unauthorized`: Authentication token is missing or invalid.
    -   `409 Conflict`: Profile already exists for this user.
    -   `422 Unprocessable Entity`: Validation error (e.g., `preferences` too long or empty based on PRD: "pole nie może być puste").

#### PUT /profiles/me
-   **Description**: Update the current authenticated user's profile preferences.
-   **HTTP Method**: `PUT`
-   **URL Path**: `/profiles/me`
-   **Query Parameters**: None
-   **Request Body**:
    ```json
    {
      "preferences": "string (required, max 1000 chars)"
    }
    ```
-   **Response Body**:
    ```json
    {
      "id": "uuid",
      "user_id": "uuid",
      "preferences": "string",
      "created_at": "timestampz",
      "modified_at": "timestampz"
    }
    ```
-   **Success Codes**:
    -   `200 OK`: Profile updated successfully.
-   **Error Codes**:
    -   `400 Bad Request`: Invalid request payload.
    -   `401 Unauthorized`: Authentication token is missing or invalid.
    -   `404 Not Found`: Profile for the user does not exist to update.
    -   `422 Unprocessable Entity`: Validation error (e.g., `preferences` too long or empty).

### 2.2. Recipe Generation

#### POST /recipes/generate
-   **Description**: Generate an AI-modified recipe based on original text and a modification prompt. This does not save the recipe but logs the generation attempt.
-   **HTTP Method**: `POST`
-   **URL Path**: `/recipes/generate`
-   **Query Parameters**: None
-   **Request Body**:
    ```json
    {
      "original_text": "string (required, max 10000 chars)",
      "modification_prompt": "string (required, max 500 chars)"
    }
    ```
-   **Response Body** (on success):
    ```json
    {
      "original_text": "string",
      "modification_prompt": "string",
      "modified_text": "string",
      "generation_id": "uuid", 
      "generated_at": "timestampz"
    }
    ```
-   **Success Codes**:
    -   `200 OK`: Recipe generated successfully.
-   **Error Codes**:
    -   `400 Bad Request`: Invalid request payload (missing fields, etc.).
    -   `401 Unauthorized`: Authentication token is missing or invalid.
    -   `408 Request Timeout`: AI generation took longer than 10 seconds.
    -   `422 Unprocessable Entity`: Validation error (e.g., text fields exceed limits).
    -   `503 Service Unavailable`: AI service (Openrouter.ai) is unavailable or returned an error. (Returns PRD error message: "Wystąpił problem podczas modyfikacji twojego przepisu, spróbuj ponownie")

#### DELETE /recipes/generate/{generation_id}
-   **Description**: Delete a specific recipe generation attempt (e.g., if the user discards the AI-generated recipe before saving it as a full recipe).
-   **HTTP Method**: `DELETE`
-   **URL Path**: `/recipes/generate/{generation_id}`
-   **Query Parameters**: None
-   **Request Body**: None
-   **Response Body**: None (HTTP 204)
-   **Success Codes**:
    -   `204 No Content`: Generation record deleted successfully.
-   **Error Codes**:
    -   `401 Unauthorized`: Authentication token is missing or invalid.
    -   `403 Forbidden`: User is not authorized to delete this generation record (does not belong to them).
    -   `404 Not Found`: Generation record with the given ID not found.

### 2.3. Recipes

#### POST /recipes
-   **Description**: Save a new recipe (original, prompt, and AI-modified version), linking it to a generation event.
-   **HTTP Method**: `POST`
-   **URL Path**: `/recipes`
-   **Query Parameters**: None
-   **Request Body**:
    ```json
    {
      "title": "string (required, max 100 chars)",
      "original_text": "string (required, max 10000 chars)",
      "modification_prompt": "string (required, max 500 chars)",
      "modified_text": "string (required, max 10000 chars)",
      "generation_id": "uuid (required, from /recipes/generate response)"
    }
    ```
-   **Response Body**:
    ```json
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "string",
      "original_text": "string",
      "modification_prompt": "string",
      "modified_text": "string",
      "generation_id": "uuid",
      "created_at": "timestampz"
    }
    ```
-   **Success Codes**:
    -   `201 Created`: Recipe saved successfully.
-   **Error Codes**:
    -   `400 Bad Request`: Invalid request payload.
    -   `401 Unauthorized`: Authentication token is missing or invalid.
    -   `422 Unprocessable Entity`: Validation error (e.g., field length limits exceeded, or `generation_id` refers to a non-existent generation).

#### GET /recipes
-   **Description**: List all saved recipes for the authenticated user.
-   **HTTP Method**: `GET`
-   **URL Path**: `/recipes`
-   **Query Parameters**:
    -   `page` (optional, integer, default: 1): For pagination.
    -   `limit` (optional, integer, default: 20, max: 100): Items per page.
    -   `sort_by` (optional, string, default: "created_at"): Field to sort by (e.g., "created_at", "title").
    -   `order` (optional, string, default: "desc"): Sort order ("asc" or "desc").
-   **Request Body**: None
-   **Response Body**:
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "title": "string",
          "created_at": "timestampz"
        }
      ],
      "pagination": {
        "current_page": 1,
        "per_page": 20,
        "total_items": 0,
        "total_pages": 0
      }
    }
    ```
-   **Success Codes**:
    -   `200 OK`: Recipes listed successfully.
-   **Error Codes**:
    -   `400 Bad Request`: Invalid query parameters.
    -   `401 Unauthorized`: Authentication token is missing or invalid.

#### GET /recipes/{id}
-   **Description**: Retrieve a specific recipe by its ID.
-   **HTTP Method**: `GET`
-   **URL Path**: `/recipes/{id}` (where `{id}` is the recipe UUID)
-   **Query Parameters**: None
-   **Request Body**: None
-   **Response Body**:
    ```json
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "string",
      "original_text": "string",
      "modification_prompt": "string",
      "modified_text": "string",
      "generation_id": "uuid",
      "created_at": "timestampz"
    }
    ```
-   **Success Codes**:
    -   `200 OK`: Recipe retrieved successfully.
-   **Error Codes**:
    -   `401 Unauthorized`: Authentication token is missing or invalid.
    -   `403 Forbidden`: User is not authorized to access this recipe (belongs to another user).
    -   `404 Not Found`: Recipe with the given ID not found.

#### PUT /recipes/{id}
-   **Description**: Update an existing recipe (e.g., its title or text fields).
-   **HTTP Method**: `PUT`
-   **URL Path**: `/recipes/{id}`
-   **Query Parameters**: None
-   **Request Body**:
    ```json
    {
      "title": "string (optional, max 100 chars)",
      "original_text": "string (optional, max 10000 chars)",
      "modification_prompt": "string (optional, max 500 chars)",
      "modified_text": "string (optional, max 10000 chars)"
    }
    ```
-   **Response Body**:
    ```json
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "string",
      "original_text": "string",
      "modification_prompt": "string",
      "modified_text": "string",
      "generation_id": "uuid",
      "created_at": "timestampz"
    }
    ```
-   **Success Codes**:
    -   `200 OK`: Recipe updated successfully.
-   **Error Codes**:
    -   `400 Bad Request`: Invalid request payload (e.g. no fields to update).
    -   `401 Unauthorized`: Authentication token is missing or invalid.
    -   `403 Forbidden`: User is not authorized to update this recipe.
    -   `404 Not Found`: Recipe with the given ID not found.
    -   `422 Unprocessable Entity`: Validation error (e.g. field length limits exceeded).

#### DELETE /recipes/{id}
-   **Description**: Delete a specific recipe by its ID.
-   **HTTP Method**: `DELETE`
-   **URL Path**: `/recipes/{id}`
-   **Query Parameters**: None
-   **Request Body**: None
-   **Response Body**: None (HTTP 204)
-   **Success Codes**:
    -   `204 No Content`: Recipe deleted successfully.
-   **Error Codes**:
    -   `401 Unauthorized`: Authentication token is missing or invalid.
    -   `403 Forbidden`: User is not authorized to delete this recipe.
    -   `404 Not Found`: Recipe with the given ID not found.

## 3. Authentication and Authorization

-   **Mechanism**: JWT (JSON Web Tokens) provided by Supabase Auth.
-   **Implementation**:
    1.  The client (Next.js frontend) authenticates with Supabase Auth (handles login/registration) and obtains a JWT.
    2.  For every request to protected API endpoints listed above, the client includes the JWT in the `Authorization` header: `Authorization: Bearer <your_jwt>`.
    3.  The API backend (e.g., Next.js API routes) verifies the JWT using Supabase's libraries/mechanisms.
    4.  The `user_id` (Supabase `auth.uid()`) extracted from the validated JWT is used for authorization, ensuring users can only access/modify their own data. This complements the RLS policies at the database level.
-   **Authorization Logic**:
    -   **Profiles**: `/profiles/me` endpoints are implicitly scoped to the authenticated user.
    -   **Recipes & Generation**: All `/recipes/*` and `/recipes/generate` endpoints are scoped to the authenticated user. Attempts to access or modify another user's data will result in a `403 Forbidden` or `404 Not Found` error, as appropriate.

## 4. Validation and Business Logic

### Input Validation (based on DB schema and PRD)

-   **`profiles.preferences`**: Required for creation/update, must not be empty, max length 1000 characters.
-   **`recipes.title`**: Required for creation, max length 100 characters.
-   **`recipes.original_text`**: Required for generation/creation, max length 10000 characters.
-   **`recipes.modification_prompt`**: Required for generation/creation, max length 500 characters.
-   **`recipes.modified_text`**: Required for creation, max length 10000 characters.
-   **`recipes.generation_id`**: Required for creation, must be a valid UUID linking to an existing generation record.
-   Numeric inputs for pagination (`page`, `limit`) will be validated for type and sensible ranges (e.g., `limit` between 1 and 100).
-   All text inputs will have leading/trailing whitespace trimmed.

### Business Logic Implementation

1.  **Recipe Generation (`POST /recipes/generate`)**:
    -   Authenticates user.
    -   Validates `original_text` and `modification_prompt` lengths.
    -   Retrieves user's `preferences` from their `profiles` table to potentially pass to the AI model (if the model supports it, otherwise it's for future use).
    -   Calls the Openrouter.ai service with the recipe data and prompt.
    -   Implements a 10-second timeout for the AI call (PRD US-004).
    -   On success: Logs the attempt to the `generations` table (including `user_id`, `model` used - if known, `source_text_hash`, `source_text_length`, `generated_count` = 1). Returns `original_text`, `modification_prompt`, `modified_text`, and the new `generation_id`.
    -   On failure (AI error or timeout): Logs to `generations_error_logs` table (including `user_id`, `model`, `source_text_hash`, `source_text_length`, `error_code`, `error_message`). Returns an appropriate HTTP error (408 or 503) with the PRD-specified message: "Wystąpił problem podczas modyfikacji twojego przepisu, spróbuj ponownie".

2.  **Declining/Discarding a Generated Recipe (`DELETE /recipes/generate/{generation_id}`)**:
    -   Authenticates user.
    -   Verifies that the `generation_id` (path parameter) exists in the `generations` table and belongs to the authenticated user.
    -   If found and ownership verified, deletes the record from the `generations` table.
    -   This action is intended for when a user generates a recipe modification but decides not to save it as a complete recipe entry.

3.  **Recipe Saving (`POST /recipes`)**:
    -   Authenticates user.
    -   Validates all input fields and their lengths.
    -   Verifies that the provided `generation_id` exists in the `generations` table and belongs to the authenticated user.
    -   Saves the recipe to the `recipes` table, associated with the `user_id` and `generation_id`.

4.  **Profile Management (`POST /profiles/me`, `PUT /profiles/me`)**
    -   `POST`: Creates a new profile if one doesn't exist for `auth.uid()`. Fails with 409 if profile exists.
    -   `PUT`: Updates an existing profile. Fails with 404 if profile doesn't exist.
    -   Both validate `preferences` field (required, not empty, max length).
    -   The `modified_at` field in `profiles` is updated automatically by the DB trigger.

5.  **Data Integrity & Security (US-009)**:
    -   All database operations are performed in the context of the authenticated `user_id`, aligning with RLS policies.
    -   `ON DELETE CASCADE` for `profiles.user_id` and `recipes.user_id` ensures that if a user is deleted from `auth.users`, their profiles and recipes are also deleted.
    -   `recipes.generation_id` has `ON DELETE SET NULL`. If a generation record is deleted, the link in recipes becomes NULL. (Note: This might conflict with a `NOT NULL` constraint if it were on `recipes.generation_id`. The provided schema has `generation_id: UUID NOT NULL` for recipes, which is a slight conflict with `ON DELETE SET NULL`. Assuming for API, `generation_id` is always present on creation).

6.  **Reverting to Original in Form (PRD US-006)**:
    -   This is primarily a frontend concern. The `POST /recipes/generate` endpoint returns both `original_text` and `modified_text`, allowing the frontend to store and switch between them without further API calls until a save is triggered.