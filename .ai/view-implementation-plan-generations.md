# API Endpoint Implementation Plan: Recipe Generation

## 1. Przegląd punktów końcowych
Ta grupa punktów końcowych obsługuje generowanie zmodyfikowanych przepisów przy użyciu AI oraz zarządzanie poszczególnymi próbami generowania.
-   `POST /recipes/generate`: Umożliwia użytkownikom generowanie nowego tekstu przepisu na podstawie oryginalnego tekstu i podpowiedzi modyfikacji. Ta operacja nie zapisuje przepisu do trwałej kolekcji użytkownika, ale loguje próbę generowania w tabeli `generations`.
-   `DELETE /recipes/generate/{generation_id}`: Pozwala użytkownikom usunąć konkretny zarejestrowany wynik generowania AI, na przykład, jeśli użytkownik zdecyduje się nie zapisywać wygenerowanego przepisu.

## 2. Wspólne szczegóły dla punktów końcowych `/recipes/generate`
-   **Bazowa ścieżka URL**: `/api/recipes/generate` (dla POST) i `/api/recipes/generate/{generation_id}` (dla DELETE).
-   **Wymagany nagłówek**: `Authorization: Bearer <jwt_token>` (dla uwierzytelnienia przez Supabase Auth).
-   **Typ zawartości (Żądanie z ciałem dla POST)**: `application/json`
-   **Typ zawartości (Odpowiedź dla POST)**: `application/json`

## 3. Szczegóły poszczególnych punktów końcowych

### 3.1. POST /recipes/generate
-   **Opis**: Generuje zmodyfikowany przepis AI na podstawie oryginalnego tekstu i podpowiedzi modyfikacji. Loguje próbę generowania.
-   **Metoda HTTP**: `POST`
-   **Struktura URL**: `/api/recipes/generate`
-   **Parametry**: Brak.
-   **Request Body (Command Model)**: `GenerateRecipeCommand` (z `src/types.ts`)
    ```json
    {
      "original_text": "string (required, max 10000 chars)",
      "modification_prompt": "string (required, max 500 chars)"
    }
    ```
-   **Odpowiedź sukcesu (200 OK)**: `GeneratedRecipeDto` (z `src/types.ts`)
    ```json
    {
      "original_text": "string",
      "modification_prompt": "string",
      "modified_text": "string",
      "generation_id": "uuid",
      "generated_at": "timestampz"
    }
    ```
-   **Kody błędów**:
    -   `400 Bad Request`: Nieprawidłowe ciało żądania (brakujące pola, złe typy).
    -   `401 Unauthorized`: Token nieobecny/nieprawidłowy.
    -   `408 Request Timeout`: Generowanie AI trwało dłużej niż 10 sekund.
    -   `422 Unprocessable Entity`: Błąd walidacji (np. pola tekstowe przekraczają limity).
    -   `503 Service Unavailable`: Usługa AI (Openrouter.ai) jest niedostępna lub zwróciła błąd. (Zwraca komunikat PRD: "Wystąpił problem podczas modyfikacji twojego przepisu, spróbuj ponownie").

### 3.2. DELETE /recipes/generate/{generation_id}
-   **Opis**: Usuwa określoną próbę generowania przepisu.
-   **Metoda HTTP**: `DELETE`
-   **Struktura URL**: `/api/recipes/generate/{generation_id}`
-   **Parametry ścieżki**:
    -   `generation_id` (wymagany, uuid): ID rekordu generowania do usunięcia.
-   **Request Body**: Brak.
-   **Odpowiedź sukcesu (204 No Content)**: Brak ciała odpowiedzi.
-   **Kody błędów**:
    -   `401 Unauthorized`: Token nieobecny/nieprawidłowy.
    -   `403 Forbidden`: Użytkownik nie jest autoryzowany do usunięcia tego rekordu generowania (nie należy do niego).
    -   `404 Not Found`: Rekord generowania o podanym ID nie został znaleziony.

## 4. Wykorzystywane typy (podsumowanie)
-   **Command Models**:
    -   `GenerateRecipeCommand` (dla `POST /recipes/generate`)
-   **DTOs**:
    -   `GeneratedRecipeDto` (dla odpowiedzi `POST /recipes/generate`)
-   **Typy Bazy Danych (Wewnętrznie)**:
    -   `TablesInsert<'generations'>`
    -   `Tables<'generations'>` (Row)
    -   `TablesInsert<'generations_error_logs'>`

## 5. Przepływ danych

### 5.1. POST /recipes/generate
1.  Klient wysyła żądanie `POST` do `/api/recipes/generate` z `original_text` i `modification_prompt`.
2.  **Uwierzytelnianie (Next.js Route Handler)**: Weryfikuje token JWT, pobiera `user_id`. Jeśli błąd, zwraca `401`.
3.  **Walidacja Danych Wejściowych**: Sprawdza `original_text` (max 10000 znaków) i `modification_prompt` (max 500 znaków). Jeśli błąd, zwraca `400` lub `422`.
4.  **Wywołanie `GenerationService.generateRecipe(userId, command)`**:
    a.  Serwis przygotowuje żądanie do Openrouter.ai.
    b.  Wywołuje API Openrouter.ai z limitem czasu 10 sekund.
        -   **Timeout**: Jeśli przekroczy 10s, loguje błąd do `generations_error_logs` (`error_code: 'TIMEOUT'`) i zwraca `408 Request Timeout`.
        -   **Błąd AI Service**: Jeśli Openrouter.ai zwróci błąd, loguje go do `generations_error_logs` (`error_code: 'AI_SERVICE_ERROR'`, `error_message` z odpowiedzi AI) i zwraca `503 Service Unavailable` z komunikatem PRD.
    c.  **Sukces AI**: Jeśli AI zwróci `modified_text`:
        i.  Oblicza `source_text_hash` (np. SHA256 z `original_text` + `modification_prompt`).
        ii. Oblicza `source_text_length` (długość `original_text` + `modification_prompt`).
        iii.Zapisuje rekord do tabeli `generations`:
            -   `user_id`: pobrany z tokenu.
            -   `model`: nazwa modelu AI (np. z konfiguracji, np. `process.env.DEFAULT_AI_MODEL`).
            -   `generated_count`: 1 (każde wywołanie to nowa, pojedyncza generacja).
            -   `accepted_count`: `NULL` (na tym etapie nie jest akceptowany).
            -   `source_text_hash`: obliczony hash.
            -   `source_text_length`: obliczona długość.
            -   Pozostałe pola (`id`, `created_at`) są zarządzane przez bazę danych.
        iv. Pobiera `generation_id` (ID nowo utworzonego rekordu) i `created_at`.
        v.  Zwraca `GeneratedRecipeDto` zawierający `original_text`, `modification_prompt`, `modified_text`, `generation_id`, `generated_at`.
5.  **Obsługa Odpowiedzi (Handler Trasy)**: Zwraca odpowiedni status i ciało na podstawie wyniku z serwisu.

### 5.2. DELETE /recipes/generate/{generation_id}
1.  Klient wysyła żądanie `DELETE` do `/api/recipes/generate/{generation_id}`.
2.  **Uwierzytelnianie (Next.js Route Handler)**: Weryfikuje token JWT, pobiera `user_id`. Jeśli błąd, zwraca `401`.
3.  **Walidacja Parametru Ścieżki**: Sprawdza, czy `generation_id` jest poprawnym UUID. Jeśli błąd, może zwrócić `400`.
4.  **Wywołanie `GenerationService.deleteGeneration(userId, generationId)`**:
    a.  Serwis najpierw pobiera rekord z tabeli `generations` używając `generationId`.
        -   Jeśli nie znaleziono, zwraca błąd mapowany na `404 Not Found`.
    b.  Sprawdza, czy `user_id` z pobranego rekordu pasuje do `userId` z tokenu.
        -   Jeśli nie pasuje, zwraca błąd mapowany na `403 Forbidden`.
    c.  Usuwa rekord z tabeli `generations`.
5.  **Obsługa Odpowiedzi (Handler Trasy)**: Jeśli serwis pomyślnie usunie, zwraca `204 No Content`. W przeciwnym razie odpowiedni kod błędu.

## 6. Względy bezpieczeństwa
-   **Uwierzytelnianie**: Standardowe użycie helperów Supabase dla Next.js API Routes.
-   **Autoryzacja**:
    -   Dla `DELETE /recipes/generate/{generation_id}`: Kluczowe jest sprawdzenie, czy uwierzytelniony użytkownik jest właścicielem rekordu `generations` przed usunięciem.
-   **Walidacja danych wejściowych**:
    -   `POST`: Sprawdzanie długości `original_text` i `modification_prompt`.
    -   `DELETE`: Sprawdzanie formatu `generation_id`.
-   **Rate Limiting**: Niezbędne dla `POST /recipes/generate` z powodu kosztów i czasu operacji AI. Implementacja po stronie serwera.
-   **Zarządzanie kluczami API**: Klucz API do Openrouter.ai musi być przechowywany bezpiecznie jako zmienna środowiskowa i używany wyłącznie po stronie serwera.
-   **Ochrona przed nadużyciami AI**: Limit czasu (10s) jest jednym ze środków. Rozważenie limitów na liczbę generacji na użytkownika w danym okresie czasu może być potrzebne w przyszłości.
-   **Logowanie błędów**: Szczegółowe logowanie błędów po stronie serwera, zwłaszcza dla interakcji z AI, do tabeli `generations_error_logs`.
-   **Prompt Injection**: Chociaż nie jest to główny cel, należy być świadomym, że `modification_prompt` może być wektorem. Podstawowa walidacja długości jest już na miejscu.

## 7. Obsługa błędów
-   **Wspólne dla obu**:
    -   `401 Unauthorized`: Nieprawidłowy/brakujący token.
    -   `500 Internal Server Error`: Nieoczekiwane błędy serwera (np. błąd bazy danych).
-   **`POST /recipes/generate`**:
    -   `400 Bad Request`: Brakujące/nieprawidłowe pola w ciele (`original_text`, `modification_prompt`).
    -   `408 Request Timeout`: Operacja AI przekroczyła 10 sekund. (Zalogować do `generations_error_logs`).
    -   `422 Unprocessable Entity`: Pola tekstowe przekraczają zdefiniowane limity.
    -   `503 Service Unavailable`: Błąd po stronie Openrouter.ai lub usługa niedostępna. (Zalogować do `generations_error_logs`, zwrócić komunikat PRD).
-   **`DELETE /recipes/generate/{generation_id}`**:
    -   `400 Bad Request`: Nieprawidłowy format `generation_id` (np. nie UUID).
    -   `403 Forbidden`: Użytkownik próbuje usunąć rekord generowania, który do niego nie należy.
    -   `404 Not Found`: Rekord generowania o podanym `generation_id` nie istnieje.

## 8. Rozważania dotyczące wydajności
-   **`POST /recipes/generate`**:
    -   **Wąskie gardło**: Wywołanie API Openrouter.ai. Limit czasu 10s jest krytyczny.
    -   Operacje na bazie danych (INSERT do `generations` i `generations_error_logs`) powinny być szybkie.
    -   Obliczanie hasha i długości tekstu jest szybkie.
-   **`DELETE /recipes/generate/{generation_id}`**:
    -   Operacje na bazie danych (`SELECT` do weryfikacji, `DELETE`) są po kluczu głównym (`id`) i `user_id`, powinny być szybkie.
-   **Asynchroniczność**: Wszystkie operacje I/O (baza danych, API zewnętrzne) muszą być asynchroniczne.

## 9. Etapy wdrożenia
1.  **Konfiguracja Zmiennych Środowiskowych**:
    -   `OPENROUTER_API_KEY`: Klucz API dla Openrouter.ai.
    -   `DEFAULT_AI_MODEL`: (np. `openai/gpt-3.5-turbo`) Domyślny model do użycia.
    -   `AI_GENERATION_TIMEOUT_MS`: (np. `10000`) Limit czasu dla wywołania AI.
2.  **Implementacja `GenerationService` (`src/services/generationService.ts`)**:
    -   Metoda `async generateRecipe(userId: string, command: GenerateRecipeCommand): Promise<GeneratedRecipeDto>`:
        -   Implementuje logikę wywołania Openrouter.ai z obsługą timeoutu (np. używając `Promise.race` z `AbortController`).
        -   Obsługuje błędy z AI, loguje do `generations_error_logs` (wymaga funkcji pomocniczej do hashowania i obliczania długości).
        -   W przypadku sukcesu, zapisuje do tabeli `generations`.
    -   Metoda `async deleteGeneration(userId: string, generationId: string): Promise<boolean>` (zwraca `true` przy sukcesie, rzuca błędy dla `NotFound` / `Forbidden`).
    -   Funkcja pomocnicza do obliczania `source_text_hash` (np. używając `crypto.createHash('sha256')`).
3.  **Implementacja Handlerów Tras API Next.js**:
    -   **`src/app/api/recipes/generate/route.ts` (dla `POST`)**:
        -   Implementuje handler `POST`.
        -   Uwierzytelnianie, walidacja ciała żądania (Zod).
        -   Wywołanie `generationService.generateRecipe`.
        -   Obsługa odpowiedzi i błędów zgodnie z planem.
    -   **`src/app/api/recipes/generate/[generation_id]/route.ts` (dla `DELETE`)**:
        -   Implementuje handler `DELETE`.
        -   Uwierzytelnianie, walidacja parametru `generation_id`.
        -   Wywołanie `generationService.deleteGeneration`.
        -   Obsługa odpowiedzi i błędów.