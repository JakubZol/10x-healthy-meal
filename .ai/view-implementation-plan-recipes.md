# API Endpoint Implementation Plan: Recipes CRUD

## 1. Przegląd punktów końcowych
Ta grupa punktów końcowych zarządza operacjami CRUD (Create, Read, Update, Delete) dla zasobów przepisów użytkownika. Umożliwia użytkownikom zapisywanie nowych przepisów (powiązanych z wcześniejszym wydarzeniem generowania AI), listowanie ich przepisów z paginacją i sortowaniem, pobieranie szczegółów konkretnego przepisu, aktualizowanie istniejącego przepisu oraz usuwanie przepisu. Wszystkie operacje są ograniczone do uwierzytelnionego użytkownika.

## 2. Wspólne szczegóły dla wszystkich punktów końcowych `/recipes`
-   **Bazowa ścieżka URL**: `/api/recipes` (zakładając standardową strukturę API w Node.js/Express)
-   **Wymagany nagłówek**: `Authorization: Bearer <jwt_token>` (dla uwierzytelnienia przez Supabase Auth)
-   **Typ zawartości (Żądanie z ciałem)**: `application/json`
-   **Typ zawartości (Odpowiedź)**: `application/json` (chyba że wskazano inaczej, np. 204 No Content)

## 3. Szczegóły poszczególnych punktów końcowych

### 3.1. POST /recipes
-   **Opis**: Zapisuje nowy przepis (oryginalny, podpowiedź i wersję zmodyfikowaną przez AI), łącząc go z wydarzeniem generowania.
-   **Metoda HTTP**: `POST`
-   **Struktura URL**: `/api/recipes`
-   **Parametry**: Brak.
-   **Request Body (Command Model)**: `CreateRecipeCommand` (z `src/types.ts`)
    ```json
    {
      "title": "string (required, max 100 chars)",
      "original_text": "string (required, max 10000 chars)",
      "modification_prompt": "string (required, max 500 chars)",
      "modified_text": "string (required, max 10000 chars)",
      "generation_id": "uuid (required, from /recipes/generate response)"
    }
    ```
-   **Odpowiedź sukcesu (201 Created)**: `RecipeDto` (z `src/types.ts`)
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
-   **Kody błędów**:
    -   `400 Bad Request`: Nieprawidłowe ciało żądania (brakujące pola, złe typy).
    -   `401 Unauthorized`: Token nieobecny/nieprawidłowy.
    -   `422 Unprocessable Entity`: Błąd walidacji (np. przekroczone limity długości, `generation_id` nie istnieje lub nie należy do użytkownika).

### 3.2. GET /recipes
-   **Opis**: Listuje wszystkie zapisane przepisy dla uwierzytelnionego użytkownika z paginacją i sortowaniem.
-   **Metoda HTTP**: `GET`
-   **Struktura URL**: `/api/recipes`
-   **Parametry zapytania**:
    -   `page` (opcjonalny, integer, domyślnie: 1): Dla paginacji.
    -   `limit` (opcjonalny, integer, domyślnie: 20, max: 100): Liczba elementów na stronę.
    -   `sort_by` (opcjonalny, string, domyślnie: "created_at"): Pole do sortowania (np. "created_at", "title"). Dopuszczalne wartości powinny być predefiniowane.
    -   `order` (opcjonalny, string, domyślnie: "desc"): Kolejność sortowania ("asc" lub "desc").
-   **Request Body**: Brak.
-   **Odpowiedź sukcesu (200 OK)**: `RecipeListDto` (z `src/types.ts`)
    ```json
    {
      "data": [ // Array of RecipeListItemDto
        {
          "id": "uuid",
          "title": "string",
          "created_at": "timestampz"
        }
      ],
      "pagination": { // PaginationDto
        "current_page": 1,
        "per_page": 20,
        "total_items": 0,
        "total_pages": 0
      }
    }
    ```
-   **Kody błędów**:
    -   `400 Bad Request`: Nieprawidłowe parametry zapytania (np. `limit` poza zakresem, nieprawidłowy `sort_by`).
    -   `401 Unauthorized`: Token nieobecny/nieprawidłowy.

### 3.3. GET /recipes/{id}
-   **Opis**: Pobiera szczegóły konkretnego przepisu na podstawie jego ID.
-   **Metoda HTTP**: `GET`
-   **Struktura URL**: `/api/recipes/{id}` (gdzie `{id}` to UUID przepisu)
-   **Parametry ścieżki**:
    -   `id` (wymagany, uuid): ID przepisu.
-   **Request Body**: Brak.
-   **Odpowiedź sukcesu (200 OK)**: `RecipeDto` (z `src/types.ts`)
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
-   **Kody błędów**:
    -   `400 Bad Request`: Nieprawidłowy format ID przepisu (nie jest UUID).
    -   `401 Unauthorized`: Token nieobecny/nieprawidłowy.
    -   `403 Forbidden`: Użytkownik nie jest autoryzowany do dostępu do tego przepisu (należy do innego użytkownika).
    -   `404 Not Found`: Przepis o podanym ID nie został znaleziony.

### 3.4. PUT /recipes/{id}
-   **Opis**: Aktualizuje istniejący przepis (np. jego tytuł lub pola tekstowe).
-   **Metoda HTTP**: `PUT`
-   **Struktura URL**: `/api/recipes/{id}`
-   **Parametry ścieżki**:
    -   `id` (wymagany, uuid): ID przepisu do aktualizacji.
-   **Request Body (Command Model)**: `UpdateRecipeCommand` (z `src/types.ts`)
    ```json
    {
      "title": "string (optional, max 100 chars)",
      "original_text": "string (optional, max 10000 chars)",
      "modification_prompt": "string (optional, max 500 chars)",
      "modified_text": "string (optional, max 10000 chars)"
    }
    ```
-   **Odpowiedź sukcesu (200 OK)**: `RecipeDto` (zaktualizowany zasób)
-   **Kody błędów**:
    -   `400 Bad Request`: Nieprawidłowe ciało żądania (np. brak pól do aktualizacji, nieprawidłowy format ID).
    -   `401 Unauthorized`: Token nieobecny/nieprawidłowy.
    -   `403 Forbidden`: Użytkownik nie jest autoryzowany do aktualizacji tego przepisu.
    -   `404 Not Found`: Przepis o podanym ID nie został znaleziony.
    -   `422 Unprocessable Entity`: Błąd walidacji (np. przekroczone limity długości).

### 3.5. DELETE /recipes/{id}
-   **Opis**: Usuwa konkretny przepis na podstawie jego ID.
-   **Metoda HTTP**: `DELETE`
-   **Struktura URL**: `/api/recipes/{id}`
-   **Parametry ścieżki**:
    -   `id` (wymagany, uuid): ID przepisu do usunięcia.
-   **Request Body**: Brak.
-   **Odpowiedź sukcesu (204 No Content)**: Brak ciała odpowiedzi.
-   **Kody błędów**:
    -   `400 Bad Request`: Nieprawidłowy format ID przepisu.
    -   `401 Unauthorized`: Token nieobecny/nieprawidłowy.
    -   `403 Forbidden`: Użytkownik nie jest autoryzowany do usunięcia tego przepisu.
    -   `404 Not Found`: Przepis o podanym ID nie został znaleziony.

## 4. Wykorzystywane typy (podsumowanie)
-   **Command Models**:
    -   `CreateRecipeCommand`
    -   `UpdateRecipeCommand`
-   **DTOs**:
    -   `RecipeDto`
    -   `RecipeListItemDto`
    -   `RecipeListDto`
    -   `PaginationDto`
-   **Typy Bazy Danych (Wewnętrznie)**:
    -   `TablesInsert<'recipes'>`
    -   `TablesUpdate<'recipes'>`
    -   `Tables<'recipes'>` (Row)
    -   `Tables<'generations'>` (do weryfikacji `generation_id`)

## 5. Przepływ danych (ogólny dla wszystkich punktów, szczegóły per endpoint)

1.  Klient wysyła żądanie HTTP do odpowiedniego punktu końcowego `/api/recipes/...`.
2.  **Middleware uwierzytelniający**: Weryfikuje token JWT Supabase. Jeśli nieprawidłowy, zwraca `401 Unauthorized`. Wyodrębnia `userId`.
3.  **Middleware walidujący**:
    -   Dla `POST`, `PUT`: Waliduje ciało żądania (obecność, typy, ograniczenia długości, formaty).
    -   Dla `GET /recipes`: Waliduje parametry zapytania (`page`, `limit`, `sort_by`, `order`).
    -   Dla `GET /recipes/{id}`, `PUT /recipes/{id}`, `DELETE /recipes/{id}`: Waliduje parametr ścieżki `id` (czy jest UUID).
    -   Jeśli walidacja nie powiedzie się, zwraca `400 Bad Request` lub `422 Unprocessable Entity`.
4.  **Kontroler Trasy**: Wywołuje odpowiednią metodę w `RecipeService`, przekazując `userId` oraz przetworzone/zwalidowane dane wejściowe.
5.  **`RecipeService`**:
    -   **`createRecipe(userId, data: CreateRecipeCommand)`**:
        -   Sprawdza, czy `generation_id` istnieje w tabeli `generations` i należy do `userId`. Jeśli nie, zwraca błąd (mapowany na `422`).
        -   Wstawia nowy rekord do tabeli `recipes` z `userId` i danymi z `data`.
        -   Zwraca utworzony `RecipeDto`.
    -   **`listRecipes(userId, { page, limit, sortBy, order })`**:
        -   Konstruuje zapytanie do tabeli `recipes` z filtrem `user_id`.
        -   Stosuje logikę sortowania i paginacji.
        -   Pobiera całkowitą liczbę przepisów dla użytkownika (dla metadanych paginacji).
        -   Zwraca `RecipeListDto`.
    -   **`getRecipeById(userId, recipeId)`**:
        -   Pobiera przepis z tabeli `recipes` na podstawie `recipeId` i `userId`.
        -   Jeśli nie znaleziono lub nie należy do użytkownika, zwraca błąd (mapowany na `404` lub `403`).
        -   Zwraca `RecipeDto`.
    -   **`updateRecipe(userId, recipeId, data: UpdateRecipeCommand)`**:
        -   Najpierw weryfikuje, czy przepis o `recipeId` istnieje i należy do `userId`. Jeśli nie, zwraca błąd (mapowany na `404` lub `403`).
        -   Aktualizuje rekord w tabeli `recipes`.
        -   Zwraca zaktualizowany `RecipeDto`.
    -   **`deleteRecipe(userId, recipeId)`**:
        -   Najpierw weryfikuje, czy przepis o `recipeId` istnieje i należy do `userId`. Jeśli nie, zwraca błąd (mapowany na `404` lub `403`).
        -   Usuwa rekord z tabeli `recipes`.
6.  **Kontroler Trasy**: Odbiera wynik z serwisu.
    -   Dla `POST`: Zwraca `201 Created` z `RecipeDto`.
    -   Dla `GET`: Zwraca `200 OK` z `RecipeListDto` lub `RecipeDto`.
    -   Dla `PUT`: Zwraca `200 OK` z `RecipeDto`.
    -   Dla `DELETE`: Zwraca `204 No Content`.
    -   Obsługuje błędy zwrócone przez serwis, mapując je na odpowiednie kody statusu HTTP. W przypadku nieoczekiwanych błędów, loguje je i zwraca `500 Internal Server Error`.

## 6. Względy bezpieczeństwa
-   **Uwierzytelnianie**: Jak opisano, middleware weryfikujący JWT Supabase. (Zasada `AUTH_MIDDLEWARE` z `nodejs.mdc`).
-   **Autoryzacja**: Wszystkie operacje na bazie danych muszą być ściśle ograniczone do `userId` pochodzącego z zweryfikowanego tokenu JWT. Zapytania SQL/Supabase muszą zawierać warunek `WHERE user_id = ?`. To zapobiega dostępowi/modyfikacji danych innych użytkowników.
-   **Walidacja danych wejściowych**: Użycie middleware walidującego (np. Zod, Joi) dla:
    -   Ciała żądania (`POST`, `PUT`): Sprawdzanie typów, wymaganych pól, limitów długości (np. `title` <= 100, `original_text` <= 10000).
    -   Parametrów ścieżki (`id`): Musi być poprawnym UUID.
    -   Parametrów zapytania (`GET /recipes`): `page`, `limit` muszą być liczbami całkowitymi w określonych zakresach; `sort_by`, `order` muszą być z predefiniowanej listy dozwolonych wartości, aby zapobiec SQL injection jeśli są bezpośrednio używane w zapytaniach (lepiej mapować na stałe wartości).
    (Zasada `VALIDATION_MIDDLEWARE` z `nodejs.mdc`).
-   **Walidacja `generation_id`**: Przy tworzeniu przepisu (`POST /recipes`), sprawdzić, czy podany `generation_id` istnieje w tabeli `generations` i należy do aktualnie uwierzytelnionego użytkownika.
-   **Rate Limiting**: Zalecane dla wszystkich punktów końcowych, zwłaszcza tych tworzących/aktualizujących dane. (Zasada `RATE_LIMITING` z `nodejs.mdc`).
-   **Ochrona przed SQL Injection**: Przy użyciu ORM/klienta Supabase, parametryzowane zapytania są domyślnie bezpieczne. Unikać bezpośredniego konstruowania zapytań SQL z danych wejściowych użytkownika.
-   **Obsługa błędów**: Ogólne komunikaty błędów dla klienta, szczegółowe logowanie po stronie serwera. (Zasada `ERROR_HANDLING_GENERIC` z `nodejs.mdc`).

## 7. Obsługa błędów
-   **Wspólne dla wszystkich**:
    -   `401 Unauthorized`: Nieprawidłowy/brakujący token.
    -   `500 Internal Server Error`: Nieoczekiwany błąd serwera (np. błąd bazy danych inny niż nieznalezienie rekordu, błąd w logice serwisu). Logować szczegóły.
-   **`POST /recipes`**:
    -   `400 Bad Request`: Brakujące/nieprawidłowe pola w ciele żądania.
    -   `422 Unprocessable Entity`: Przekroczone limity długości; `generation_id` nieprawidłowy (nie znaleziono lub nie należy do użytkownika).
-   **`GET /recipes`**:
    -   `400 Bad Request`: Nieprawidłowe parametry paginacji/sortowania.
-   **`GET /recipes/{id}`, `PUT /recipes/{id}`, `DELETE /recipes/{id}`**:
    -   `400 Bad Request`: Nieprawidłowy format `id` (nie UUID).
    -   `403 Forbidden`: Próba dostępu/modyfikacji/usunięcia przepisu nienależącego do użytkownika.
    -   `404 Not Found`: Przepis o podanym `id` nie istnieje.
-   **`PUT /recipes/{id}`**:
    -   `400 Bad Request`: Ciało żądania puste (brak pól do aktualizacji).
    -   `422 Unprocessable Entity`: Przekroczone limity długości w aktualizowanych polach.

(Zasada `LOGGING` z `nodejs.mdc` powinna być stosowana do logowania wszystkich błędów po stronie serwera).

## 8. Rozważania dotyczące wydajności
-   **Zapytania do bazy danych**:
    -   `POST`: Prosty `INSERT`.
    -   `GET /recipes`: Zapytanie z `WHERE user_id = ?`, `ORDER BY`, `LIMIT`, `OFFSET`. Wymaga indeksu na `(user_id, created_at)` i `(user_id, title)` dla efektywnego sortowania. Osobne zapytanie `COUNT(*)` dla paginacji.
    -   `GET /recipes/{id}`, `PUT /recipes/{id}`, `DELETE /recipes/{id}`: Zapytania `SELECT`, `UPDATE`, `DELETE` z `WHERE id = ? AND user_id = ?`. Wymaga indeksu głównego na `id` i indeksu na `user_id`.
-   **Rozmiar odpowiedzi**:
    -   `GET /recipes`: Paginacja jest kluczowa. Odpowiedź `RecipeListItemDto` powinna zawierać tylko niezbędne pola.
    -   `GET /recipes/{id}`: Może zawierać długie pola tekstowe (`original_text`, `modified_text`).
-   **Asynchroniczność**: Wszystkie operacje na bazie danych muszą być asynchroniczne. (Zasada `ASYNC_OPERATIONS` z `nodejs.mdc`).
-   **Walidacja `generation_id`**: Dodatkowe zapytanie do bazy danych przy `POST /recipes`. Może być zoptymalizowane, jeśli `generation_id` jest globalnie unikalne i zawiera informacje o użytkowniku, ale bezpieczniej jest zweryfikować.

## 9. Etapy wdrożenia
1.  **Konfiguracja projektu (jeśli jeszcze nie zrobione)**:
    -   Zainstalować zależności: `express` (lub inny framework Node.js), bibliotekę walidacji (np. `zod`), `@supabase/supabase-js`.
    -   Skonfigurować zmienne środowiskowe. (Zasada `ENV_CONFIG` z `nodejs.mdc`).
2.  **Implementacja Middleware (jeśli jeszcze nie zrobione)**:
    -   Middleware uwierzytelniający (wspólny).
    -   Middleware walidujący dla każdego punktu końcowego (lub bardziej generyczny z konfiguracją per trasa).
3.  **Implementacja `RecipeService` (`src/services/recipeService.ts`)**:
    -   Metoda `createRecipe(userId: string, data: CreateRecipeCommand): Promise<RecipeDto>`
    -   Metoda `listRecipes(userId: string, queryParams: { page: number, limit: number, sortBy: string, order: string }): Promise<RecipeListDto>`
    -   Metoda `getRecipeById(userId: string, recipeId: string): Promise<RecipeDto | null>` (zwraca null jeśli nie znaleziono/nieautoryzowany, handler mapuje na 403/404)
    -   Metoda `updateRecipe(userId: string, recipeId: string, data: UpdateRecipeCommand): Promise<RecipeDto | null>`
    -   Metoda `deleteRecipe(userId: string, recipeId: string): Promise<boolean>` (zwraca true/false lub rzuca błędy dla 403/404)
4.  **Implementacja Kontrolerów Tras API (`src/routes/recipeRoutes.ts` lub podobne)**:
    -   Utworzyć router Express (lub odpowiednik dla innego frameworka).
    -   Dla każdego punktu końcowego (`POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`):
        -   Zastosować odpowiednie middleware.
        -   Wywołać metodę serwisu.
        -   Obsłużyć odpowiedź sukcesu i różne scenariusze błędów, mapując je na kody statusu HTTP.
        -   Implementować `try...catch` dla globalnej obsługi błędów.
 5.  **Typowanie**: Zapewnić silne typowanie dla żądań i odpowiedzi. (Zasada `TYPED_API_ROUTES` z `nextjs.mdc`).
