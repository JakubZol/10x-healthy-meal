# Architektura UI dla HealthyMealAI

## 1. Przegląd struktury UI

HealthyMealAI to aplikacja webowa MVP wykorzystująca Next.js z Material-UI, zaprojektowana jako Single Page Application z czterema głównymi widokami połączonymi persistent navigation bar. Architektura opiera się na prostym, statycznym interfejsie skupionym na funkcjonalności generowania i zarządzania przepisami przy użyciu AI.

Struktura aplikacji składa się z:
- Systemu uwierzytelniania (Supabase Auth)
- Głównego layoutu z topbar navigation
- Czterech kluczowych widoków obsługujących pełny cykl życia przepisu
- Systemu komponentów UI opartego na Material-UI
- Responsywnego designu wykorzystującego CSS Flexbox

## 2. Lista widoków

### 2.1. Widok uwierzytelniania
- **Nazwa widoku**: AuthView
- **Ścieżka widoku**: `/` (strona główna dla niezalogowanych użytkowników)
- **Główny cel**: Umożliwienie logowania i rejestracji użytkowników
- **Kluczowe informacje do wyświetlenia**:
  - Formularz logowania (email, hasło)
  - Formularz rejestracji (email, hasło, potwierdzenie hasła)
  - Komunikaty błędów walidacji
  - Loading state podczas uwierzytelniania
- **Kluczowe komponenty widoku**:
  - `LoginForm` - formularz logowania z walidacją
  - `RegisterForm` - formularz rejestracji z walidacją hasła (min. 8 znaków)
  - `AuthToggle` - przełącznik między logowaniem a rejestracją
  - `ErrorDisplay` - wyświetlanie błędów uwierzytelniania
- **UX, dostępność i względy bezpieczeństwa**:
  - Walidacja email w czasie rzeczywistym
  - Ukrywanie/pokazywanie hasła
  - Keyboard navigation między polami
  - ARIA labels dla screen readers
  - Automatyczne przekierowanie po sukcesie na `/profile`

### 2.2. Widok profilu użytkownika
- **Nazwa widoku**: ProfileView
- **Ścieżka widoku**: `/profile` (strona główna po zalogowaniu)
- **Główny cel**: Zarządzanie preferencjami żywieniowymi i przeglądanie listy zapisanych przepisów
- **Kluczowe informacje do wyświetlenia**:
  - Email użytkownika (tylko do odczytu)
  - Preferencje żywieniowe z możliwością edycji inline
  - Lista przepisów w formie kafelków (tytuł, data utworzenia)
  - Paginacja (max 20 przepisów na stronę)
  - Empty state dla użytkowników bez przepisów
- **Kluczowe komponenty widoku**:
  - `ProfileHeader` - sekcja informacji użytkownika z inline editing preferencji
  - `RecipeGrid` - siatka kafelków przepisów z skeleton loading
  - `RecipeCard` - kafelek przepisu z opcją usuwania (ikona śmietnika)
  - `PaginationControls` - numerowana paginacja (MUI Pagination)
  - `EmptyRecipeState` - komunikat "Użytkownik nie posiada zapisanych żadnych przepisów"
- **UX, dostępność i względy bezpieczeństwa**:
  - Inline editing preferencji z przyciskami "Edytuj"/"Zapisz"/"Anuluj"
  - Character counter dla preferencji (limit 1000 znaków)
  - Placeholder "Dodaj preferencje" dla nowych użytkowników
  - Skeleton loading podczas ładowania przepisów
  - Toast notifications dla błędów zapisywania preferencji
  - Usuwanie przepisów z kafelków bez potwierdzenia
  - Keyboard navigation w siatce przepisów

### 2.3. Widok formularza dodawania przepisu
- **Nazwa widoku**: AddRecipeView
- **Ścieżka widoku**: `profile/add-recipe`
- **Główny cel**: Generowanie zmodyfikowanych przepisów przy użyciu AI i ich zapisywanie
- **Kluczowe informacje do wyświetlenia**:
  - Formularz z polami: tytuł, oryginalny przepis, instrukcje modyfikacji
  - Character counter dla instrukcji modyfikacji (limit 500 znaków)
  - Wygenerowany przepis po przetworzeniu przez AI
  - Loading state podczas generowania AI
  - Błędy walidacji inline pod polami
- **Kluczowe komponenty widoku**:
  - `RecipeForm` - główny formularz z walidacją Zod
  - `GenerationLoader` - loader zastępujący formularz podczas przetwarzania AI
  - `GeneratedRecipeDisplay` - wyświetlanie wygenerowanego przepisu
  - `CharacterCounter` - licznik znaków dla pola modyfikacji
  - `ErrorModal` - modal błędów AI z komunikatem z PRD
  - `ActionButtons` - przyciski "Generuj", "Zapisz", "Cofnij do oryginału"
- **UX, dostępność i względy bezpieczeństwa**:
  - Walidacja w czasie rzeczywistym z inline errors
  - Blokada przekroczenia limitu znaków
  - Loader z animacją podczas generowania AI (≤10 sekund)
  - Modal błędów AI tylko z przyciskiem "OK"
  - Funkcja "Cofnij do oryginału" bez potwierdzenia
  - Przekierowanie na profil po zapisaniu z toast potwierdzającym
  - Zachowanie wartości formularza po błędach AI

### 2.4. Widok szczegółów przepisu
- **Nazwa widoku**: RecipeDetailView
- **Ścieżka widoku**: `profile/recipe/[id]`
- **Główny cel**: Wyświetlanie pełnych informacji o przepisie z opcjami zarządzania
- **Kluczowe informacje do wyświetlenia**:
  - Tytuł przepisu
  - Data utworzenia
  - Oryginalny przepis
  - Instrukcje modyfikacji
  - Zmodyfikowany przepis przez AI
  - Wszystkie informacje w formacie "tytuł: treść"
- **Kluczowe komponenty widoku**:
  - `RecipeDetailHeader` - tytuł i data
  - `RecipeContent` - sekcje z oryginalnym i zmodyfikowanym przepisem
  - `RecipeActions` - przyciski "Usuń przepis" i "Wróć do profilu"
  - `ConfirmationDialog` - potwierdzenie usuwania przepisu
  - `SkeletonLoader` - skeleton loading dla całego widoku
- **UX, dostępność i względy bezpieczeństwa**:
  - Wyświetlanie tylko do odczytu
  - Usuwanie z potwierdzeniem (w przeciwieństwie do kafelków)
  - Skeleton loading podczas ładowania szczegółów
  - Bezpośredni powrót do profilu
  - Proper heading hierarchy dla screen readers
  - Error handling dla nieistniejących przepisów (404)

## 3. Mapa podróży użytkownika

### 3.1. Główny przepływ użytkownika
1. **Uwierzytelnianie**: `/` → walidacja → przekierowanie na `/profile`
2. **Zarządzanie preferencjami**: `/profile` → inline editing preferencji → toast potwierdzający
3. **Tworzenie przepisu**: `/profile` → `/add-recipe` → wypełnienie formularza → generowanie AI → zapis → `/profile` z toast
4. **Przeglądanie przepisów**: `/profile` → kliknięcie kafelka → `/recipe/[id]` → powrót do `/profile`
5. **Usuwanie przepisów**: 
   - Z kafelka: kliknięcie ikony śmietnika → usunięcie bez potwierdzenia
   - Ze szczegółów: przycisk "Usuń" → dialog potwierdzenia → usunięcie → powrót do `/profile`

### 3.2. Przepływ obsługi błędów
1. **Błędy AI**: Formularz → generowanie → błąd → modal z komunikatem PRD → powrót do formularza
2. **Błędy walidacji**: Inline errors pod polami w czasie rzeczywistym
3. **Błędy sieci**: Toast notifications z opcją ponowienia
4. **Błędy autoryzacji**: Automatyczne przekierowanie na `/`

### 3.3. Stany specjalne
1. **Empty state**: Nowy użytkownik → `/profile` → komunikat o braku przepisów → CTA "Dodaj pierwszy przepis"
2. **Loading states**: Skeleton loading dla list i szczegółów, loader dla generowania AI
3. **Offline handling**: Graceful degradation z komunikatami o braku połączenia

## 4. Układ i struktura nawigacji

### 4.1. Persistent Navigation (TopBar)
- **Pozycja**: Górna część każdego widoku (z wyjątkiem `/`)
- **Elementy nawigacji**:
  - "Profil użytkownika" → `/profile`
  - "Dodaj nowy przepis" → `/add-recipe`
  - "Wyloguj" (po prawej stronie) → wylogowanie + przekierowanie na `/`
- **Responsywność**: Hamburger menu na urządzeniach mobilnych

### 4.2. Nawigacja kontekstowa
- **Szczegóły przepisu**: Przycisk "Wróć do profilu" → `/profile`
- **Formularz przepisu**: Automatyczne przekierowanie po zapisaniu → `/profile`
- **Brak breadcrumbs**: Zgodnie z decyzjami z sesji planowania

### 4.3. Zabezpieczenia nawigacji
- **AuthGuard**: Ochrona wszystkich route'ów z wyjątkiem `/`
- **Redirect logic**: Niezalogowani użytkownicy → `/`, zalogowani → `/profile`
- **Deep linking**: Obsługa bezpośrednich linków z proper error handling

## 5. Kluczowe komponenty

### 5.1. Layout Components
- **`AppLayout`**: Główny layout z TopBar i content area
- **`TopBar`**: Persistent navigation z responsive menu
- **`AuthGuard`**: HOC dla protected routes z redirect logic
- **`PageContainer`**: Wrapper dla content z proper spacing i responsive behavior

### 5.2. Form Components
- **`RecipeForm`**: Główny formularz z React Hook Form + Zod validation
- **`InlineEditor`**: Komponent do inline editing preferencji
- **`CharacterCounter`**: Licznik znaków z visual feedback przy zbliżaniu się do limitu
- **`ValidationError`**: Standardowy komponent dla inline errors

### 5.3. Data Display Components
- **`RecipeCard`**: Kafelek przepisu z hover effects i delete button
- **`RecipeGrid`**: Responsive grid layout dla kafelków
- **`RecipeDetail`**: Structured display dla pełnych informacji o przepisie
- **`EmptyState`**: Reusable empty state z customizable message i CTA

### 5.4. Feedback Components
- **`LoadingSpinner`**: Standardowy loader z animacją
- **`SkeletonLoader`**: Skeleton loading dla różnych layout'ów
- **`ToastNotification`**: Toast system z różnymi typami (success, error, info)
- **`ErrorModal`**: Modal dla błędów AI z proper focus management
- **`ConfirmationDialog`**: Reusable dialog dla potwierdzenia akcji

### 5.5. Navigation Components
- **`Pagination`**: MUI Pagination z custom styling
- **`BackButton`**: Standardowy przycisk powrotu z proper routing
- **`NavigationLink`**: Enhanced Link component z active states

### 5.6. Utility Components
- **`ProtectedRoute`**: Route wrapper z authentication check
- **`ErrorBoundary`**: Global error handling z fallback UI
- **`MetaHead`**: SEO i meta tags management
- **`AccessibilityHelper`**: Utilities dla screen readers i keyboard navigation 
