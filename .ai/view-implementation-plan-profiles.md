# API Endpoint Implementation Plan: Profiles Management

## 1. Przegląd punktów końcowych
Ta grupa punktów końcowych zarządza operacjami CRUD (Create, Read, Update) dla zasobu profilu użytkownika. Umożliwia użytkownikom pobieranie, tworzenie (przy pierwszym zapisie preferencji) oraz aktualizowanie ich preferencji żywieniowych. Wszystkie operacje są ograniczone do aktualnie uwierzytelnionego użytkownika i odnoszą się do ścieżki `/profiles/me`.

## 2. Wspólne szczegóły dla wszystkich punktów końcowych `/profiles/me`
-   **Bazowa ścieżka URL**: `/api/profiles/me` (zgodnie z konwencją Next.js API Routes, np. `src/pages/api/profiles/me.ts` lub `src/app/api/profiles/me/route.ts`)
-   **Wymagany nagłówek**: `Authorization: Bearer <jwt_token>` (dla uwierzytelnienia przez Supabase Auth).
-   **Typ zawartości (Żądanie z ciałem)**: `application/json`
-   **Typ zawartości (Odpowiedź)**: `application/json`

## 3. Szczegóły poszczególnych punktów końcowych

### 3.1. GET /profiles/me
-   **Opis**: Pobiera profil aktualnie uwierzytelnionego użytkownika.
-   **Metoda HTTP**: `GET`
-   **Struktura URL**: `/api/profiles/me`
-   **Parametry**: Brak.
-   **Request Body**: Brak.
-   **Odpowiedź sukcesu (200 OK)**: `ProfileDto` (z `src/types.ts`)
    ```json
    {
      "id": "uuid",
      "user_id": "uuid",
      "preferences": "string (max 1000 chars)",
      "created_at": "timestampz",
      "modified_at": "timestampz"
    }
    ```
-   **Kody błędów**:
    -   `401 Unauthorized`: Token nieobecny/nieprawidłowy.
    -   `404 Not Found`: Profil dla użytkownika nie istnieje.

### 3.2. POST /profiles/me
-   **Opis**: Tworzy profil dla aktualnie uwierzytelnionego użytkownika, jeśli jeszcze nie istnieje.
-   **Metoda HTTP**: `POST`
-   **Struktura URL**: `/api/profiles/me`
-   **Parametry**: Brak.
-   **Request Body (Command Model)**: `CreateProfileCommand` (z `src/types.ts`)
    ```json
    {
      "preferences": "string (required, max 1000 chars)"
    }
    ```
-   **Odpowiedź sukcesu (201 Created)**: `ProfileDto` (z `src/types.ts`)
-   **Kody błędów**:
    -   `400 Bad Request`: Nieprawidłowe ciało żądania (np. brakujące `preferences`).
    -   `401 Unauthorized`: Token nieobecny/nieprawidłowy.
    -   `409 Conflict`: Profil dla tego użytkownika już istnieje.
    -   `422 Unprocessable Entity`: Błąd walidacji (np. `preferences` za długie lub puste).

### 3.3. PUT /profiles/me
-   **Opis**: Aktualizuje preferencje w profilu aktualnie uwierzytelnionego użytkownika.
-   **Metoda HTTP**: `PUT`
-   **Struktura URL**: `/api/profiles/me`
-   **Parametry**: Brak.
-   **Request Body (Command Model)**: `UpdateProfileCommand` (z `src/types.ts`)
    ```json
    {
      "preferences": "string (required, max 1000 chars)"
    }
    ```
-   **Odpowiedź sukcesu (200 OK)**: `ProfileDto` (zaktualizowany zasób)
-   **Kody błędów**:
    -   `400 Bad Request`: Nieprawidłowe ciało żądania.
    -   `401 Unauthorized`: Token nieobecny/nieprawidłowy.
    -   `404 Not Found`: Profil dla użytkownika nie istnieje (więc nie można go zaktualizować).
    -   `422 Unprocessable Entity`: Błąd walidacji (np. `preferences` za długie lub puste).

## 4. Wykorzystywane typy (podsumowanie)
-   **Command Models**:
    -   `CreateProfileCommand`
    -   `UpdateProfileCommand`
-   **DTOs**:
    -   `ProfileDto`
-   **Typy Bazy Danych (Wewnętrznie)**:
    -   `TablesInsert<'profiles'>`
    -   `TablesUpdate<'profiles'>`
    -   `Tables<'profiles'>` (Row)

## 5. Przepływ danych (ogólny dla wszystkich punktów)

1.  Klient wysyła żądanie HTTP do `/api/profiles/me`.
2.  **Uwierzytelnianie (Next.js Route Handler)**:
    -   Używa `createPagesServerClient` / `createRouteHandlerClient` (lub odpowiednika dla używanej wersji Next.js/Supabase helperów) do weryfikacji tokenu JWT i pobrania `user`.
    -   Jeśli brak `user` (uwierzytelnianie nie powiodło się), zwraca `401 Unauthorized`.
    -   Pobiera `userId = user.id`.
3.  **Walidacja Danych Wejściowych (dla POST, PUT)**:
    -   Używa biblioteki walidacyjnej (np. Zod) do sprawdzenia ciała żądania (`preferences`) pod kątem obecności, typu i ograniczeń długości (max 1000, niepuste).
    -   Jeśli walidacja nie powiedzie się, zwraca `400 Bad Request` lub `422 Unprocessable Entity`.
4.  **Wywołanie Logiki Serwisowej (Handler Trasy wywołuje `ProfileService`)**:
    -   **`ProfileService.getProfile(userId: string)` (dla GET)**:
        -   Pobiera profil z tabeli `profiles` używając `supabase.from('profiles').select('*').eq('user_id', userId).single()`.
        -   Jeśli nie znaleziono (Supabase zwraca `data: null` i `error` z kodem `PGRST116`), serwis zwraca `null` lub rzuca `NotFoundError`.
        -   Zwraca `ProfileDto`.
    -   **`ProfileService.createProfile(userId: string, data: CreateProfileCommand)` (dla POST)**:
        -   Najpierw sprawdza, czy profil dla `userId` już istnieje. Jeśli tak, rzuca `ConflictError`.
        -   Wstawia nowy rekord do `profiles` z `user_id` i `preferences`. `created_at` i `modified_at` są ustawiane domyślnie przez bazę danych.
        -   Zwraca nowo utworzony `ProfileDto`.
    -   **`ProfileService.updateProfile(userId: string, data: UpdateProfileCommand)` (dla PUT)**:
        -   Aktualizuje rekord w `profiles` dla `userId`, ustawiając `preferences`. Trigger bazy danych powinien zaktualizować `modified_at`.
        -   Jeśli aktualizacja dotyczy 0 wierszy (profil nie istnieje), rzuca `NotFoundError`.
        -   Pobiera i zwraca zaktualizowany `ProfileDto`.
5.  **Obsługa Odpowiedzi (Handler Trasy)**:
    -   Dla `GET`: Jeśli serwis zwróci profil, odpowiada `200 OK` z `ProfileDto`. Jeśli `null`/`NotFoundError`, odpowiada `404 Not Found`.
    -   Dla `POST`: Jeśli serwis pomyślnie utworzy profil, odpowiada `201 Created` z `ProfileDto`. Jeśli `ConflictError`, odpowiada `409 Conflict`.
    -   Dla `PUT`: Jeśli serwis pomyślnie zaktualizuje profil, odpowiada `200 OK` z `ProfileDto`. Jeśli `NotFoundError`, odpowiada `404 Not Found`.
    -   W przypadku nieoczekiwanych błędów z serwisu lub innych, loguje błąd i odpowiada `500 Internal Server Error`.

## 6. Względy bezpieczeństwa
-   **Uwierzytelnianie**: Kluczowe. Użycie helperów Supabase do ochrony tras API Next.js jest standardem. (Zasada `SUPABASE_AUTH_INTEGRATION` z `nextjs.mdc`).
-   **Autoryzacja**: Ponieważ ścieżka `/me` implikuje działanie na zasobach zalogowanego użytkownika, `userId` z tokenu JWT jest jedynym identyfikatorem użytkownika używanym w zapytaniach do bazy danych. Zapobiega to dostępowi do profili innych użytkowników.
-   **Walidacja danych wejściowych**: (Zasada `DATA_VALIDATION` z `nextjs.mdc`)
    -   Dla `POST` i `PUT`: `preferences` musi być stringiem, niepustym i nieprzekraczającym 1000 znaków. Middleware lub biblioteka walidacyjna (np. Zod) powinna to zapewnić przed wywołaniem logiki serwisowej.
-   **Rate Limiting**: Chociaż operacje na profilu nie są tak kosztowne jak generowanie AI, podstawowy rate limiting może być rozważony dla ochrony przed nadużyciami.
-   **Ochrona CSRF**: Next.js API routes mają pewne wbudowane zabezpieczenia, ale należy być świadomym konfiguracji.
-   **Obsługa błędów**: Ogólne komunikaty dla klienta, szczegółowe logi serwera. (Zasada `ERROR_HANDLING` z `nextjs.mdc`).

## 7. Obsługa błędów
-   **Wspólne dla wszystkich**:
    -   `401 Unauthorized`: Nieprawidłowy/brakujący token. Handler trasy Next.js zwraca to na podstawie wyniku Supabase Auth.
    -   `500 Internal Server Error`: Nieoczekiwany błąd serwera. Globalny handler błędów lub `try...catch` w handlerze trasy.
-   **`GET /profiles/me`**:
    -   `404 Not Found`: Profil dla `userId` nie istnieje w bazie danych.
-   **`POST /profiles/me`**:
    -   `400 Bad Request`: Brak `preferences` lub nieprawidłowy typ.
    -   `409 Conflict`: Profil dla `userId` już istnieje.
    -   `422 Unprocessable Entity`: `preferences` jest puste lub przekracza 1000 znaków.
-   **`PUT /profiles/me`**:
    -   `400 Bad Request`: Brak `preferences` lub nieprawidłowy typ.
    -   `404 Not Found`: Profil dla `userId` nie istnieje, więc nie można go zaktualizować.
    -   `422 Unprocessable Entity`: `preferences` jest puste lub przekracza 1000 znaków.

(Zasada `TYPED_API_ROUTES` z `nextjs.mdc` powinna być stosowana do zapewnienia typowanych odpowiedzi, w tym błędów).

## 8. Rozważania dotyczące wydajności
-   **Zapytania do bazy danych**:
    -   `GET`: Prosty `SELECT` po `user_id` (klucz obcy i unikalny indeks), bardzo szybki.
    -   `POST`: `SELECT` (do sprawdzenia konfliktu) a następnie `INSERT`. Oba po `user_id`.
    -   `PUT`: `UPDATE` po `user_id`.
    Wszystkie operacje powinny być wydajne dzięki indeksowi na `user_id`.
-   **Rozmiar odpowiedzi/żądania**: Pole `preferences` (do 1000 znaków) jest głównym elementem danych; jego rozmiar jest akceptowalny.
-   **Caching**: Dane profilu mogą być kandydatem do cachowania po stronie klienta (np. w React Query, SWR), jeśli nie zmieniają się zbyt często. Po stronie serwera cachowanie jest mniej prawdopodobne dla tego typu danych per użytkownik.

## 9. Etapy wdrożenia
1.  **Konfiguracja trasy API Next.js**:
    -   Utworzyć plik `src/app/api/profiles/me/route.ts` (dla App Router) lub `src/pages/api/profiles/me.ts` (dla Pages Router). (Zasada `API_ROUTE_STRUCTURE` z `nextjs.mdc`).
    -   Zaimplementować handlery dla metod `GET`, `POST`, `PUT` w tym samym pliku trasy.
2.  **Implementacja `ProfileService` (`src/services/profileService.ts` - jeśli nie istnieje, utworzyć)**:
    -   Metoda `async getProfile(userId: string): Promise<ProfileDto | null>`
    -   Metoda `async createProfile(userId: string, data: CreateProfileCommand): Promise<ProfileDto>` (wewnętrznie obsługuje sprawdzenie konfliktu).
    -   Metoda `async updateProfile(userId: string, data: UpdateProfileCommand): Promise<ProfileDto | null>` (wewnętrznie obsługuje przypadek "nie znaleziono").
    -   Wszystkie metody używają klienta Supabase do interakcji z tabelą `profiles`.
3.  **Logika w Handlerach Tras API**:
    -   Dla każdej metody HTTP (`GET`, `POST`, `PUT`):
        a.  Uwierzytelnianie: Użyć `createRouteHandlerClient` (App Router) lub `createPagesServerClient` (Pages Router) do pobrania `user`. Jeśli brak `user`, zwrócić `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`.
        b.  Pobrać `userId = user.id`.
        c.  **Dla POST/PUT**: Zwalidować `req.json()` (ciało żądania) używając Zod (lub innej biblioteki) przeciwko `CreateProfileCommand` / `UpdateProfileCommand`. W przypadku błędu walidacji, zwrócić `NextResponse.json({ error: 'Validation failed', details: validationError.errors }, { status: 422 })`.
        d.  Wywołać odpowiednią metodę `ProfileService`.
        e.  Obsłużyć wynik z serwisu:
            -   Sukces: Zwrócić `NextResponse.json(profileData, { status: 200 lub 201 })`.
            -   Błędy (np. NotFound, Conflict): Zwrócić odpowiedni `NextResponse.json({ error: '...' }, { status: kod_błędu })`.
        f.  Otoczyć blokiem `try...catch` dla nieoczekiwanych błędów, logować je i zwracać `NextResponse.json({ error: 'Internal server error' }, { status: 500 })`.
4.  **Typowanie**: Zapewnić silne typowanie dla żądań i odpowiedzi. (Zasada `TYPED_API_ROUTES` z `nextjs.mdc`).
