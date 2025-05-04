# Dokument wymagań produktu (PRD) - HealthyMealAI

## 1. Przegląd produktu
HealthyMealAI to aplikacja webowa, która wykorzystuje sztuczną inteligencję wraz z preferencjami żywieniowymi użytkownika, aby automatycznie modyfikować ogólnodostępne przepisy kulinarne i proponować spersonalizowane wersje. Wersja MVP umożliwia tworzenie, przeglądanie i zarządzanie przepisami w formie tekstowej, prosty system kont użytkowników oraz stronę profilu z preferencjami żywieniowymi.

## 2. Problem użytkownika
W sieci dostępnych jest wiele przepisów kulinarnych, ale dostosowanie ich do indywidualnych potrzeb dietetycznych i wymagań żywieniowych zajmuje dużo czasu i wymaga znajomości obliczeń wartości odżywczych. Użytkownicy potrzebują narzędzia, które:
- zautomatyzuje modyfikację przepisu zgodnie z ich preferencjami,
- pozwoli szybko zapisać i zarządzać spersonalizowanymi przepisami.

## 3. Wymagania funkcjonalne
1. Formularz wprowadzania przepisu
   - pole tekstowe na oryginalny przepis (bez limitu znaków)
   - pole tekstowe na opis modyfikacji (limit 500 znaków)
   - licznik znaków i blokada wpisu po przekroczeniu limitu
2. Integracja z AI
   - generowanie zmodyfikowanego przepisu w czasie nie przekraczającym 10 sekund
   - loader z komunikatem Trwa analiza i modyfikacja przepisu
   - obsługa błędów generowania (komunikat o problemie i powrót do formularza)
3. Zarządzanie przepisami
   - zapis zmodyfikowanego przepisu jednym kliknięciem
   - możliwość cofnięcia do oryginalnego przepisu w formularzu bez historii wersji
   - usuwanie przepisów
4. System kont użytkowników
   - rejestracja i logowanie (email i hasło)
   - autoryzacja dostępu do własnych przepisów (RLS, walidacja)
5. Profil użytkownika
   - tekstowe pole wolnego opisu preferencji żywieniowych na stronie profilu
   - zapisywanie i edycja preferencji
   - lista zapisanych przepisów
6. Bezpieczeństwo i praktyki
   - walidacja danych wejściowych
   - uwierzytelnianie i autoryzacja operacji na przepisach

## 4. Granice produktu
Wersja MVP nie obejmuje:
- importu przepisów z zewnętrznych adresów URL
- bogatej obsługi multimediów (np. zdjęcia, wideo)
- udostępniania przepisów innym użytkownikom
- funkcji społecznościowych (komentarze, polubienia, ranking użytkowników)

## 5. Historyjki użytkowników
- ID: US-001
  Tytuł: Rejestracja konta
  Opis: Jako nowy użytkownik chcę założyć konto (email i hasło), aby uzyskać dostęp do aplikacji.
  Kryteria akceptacji:
  - formularz z polami email i hasło
  - walidacja formatu email i minimalnej długości hasła (8 znaków)
  - wyświetlenie komunikatu błędu przy niepoprawnych danych
  - po sukcesie użytkownik zostaje zalogowany i przekierowany do profilu

- ID: US-002
  Tytuł: Logowanie
  Opis: Jako zarejestrowany użytkownik chcę się zalogować, aby zarządzać moimi przepisami.
  Kryteria akceptacji:
  - formularz loginu z polami email i hasło
  - komunikat o błędnych danych przy nieudanym logowaniu
  - po sukcesie przekierowanie do strony głównej lub profilu

- ID: US-003
  Tytuł: Uzupełnienie preferencji żywieniowych
  Opis: Jako zalogowany użytkownik chcę wprowadzić moje preferencje żywieniowe w profilu, aby AI mogło dostosować przepisy.
  Kryteria akceptacji:
  - strona profilu z polem tekstowym na preferencje (bez limitu)
  - walidacja (pole nie może być puste przy zapisie)
  - po zapisaniu preferencje są widoczne i przechowywane

- ID: US-004
  Tytuł: Generowanie zmodyfikowanego przepisu
  Opis: Jako użytkownik chcę wkleić oryginalny przepis i opis modyfikacji, aby AI wygenerowało spersonalizowaną wersję.
  Kryteria akceptacji:
  - formularz z dwoma polami textarea: oryginał (brak limitu) i instrukcja (limit 500)
  - licznik znaków dla instrukcji i blokada przekroczenia limitu
  - przycisk Generuj uruchamia loader z komunikatem
  - AI zwraca wynik w ≤10 sekund lub wyświetlany jest komunikat o timeout

- ID: US-005
  Tytuł: Zapis przepisu
  Opis: Jako użytkownik chcę jednym kliknięciem zapisać wygenerowany przepis.
  Kryteria akceptacji:
  - przycisk Zapisz zapisuje przepis w bazie danych
  - przepis pojawia się na liście zapisanych z tytułem i datą
  - użytkownik widzi potwierdzenie zapisu

- ID: US-006
  Tytuł: Cofnięcie do oryginału
  Opis: Jako użytkownik chcę móc cofnąć zmodyfikowany przepis do pierwotnej wersji w formularzu.
  Kryteria akceptacji:
  - przycisk Cofnij przywraca treść oryginalnego przepisu i instrukcji
  - nie jest tworzona żadna historia wersji

- ID: US-007
  Tytuł: Lista zapisanych przepisów
  Opis: Jako użytkownik chcę przeglądać listę zapisanych przepisów z tytułem i datą oraz rozwijać je do pełnego podglądu.
  Kryteria akceptacji:
  - strona z listą wszystkich przepisów użytkownika
  - każdy element pokazuje tytuł i datę
  - przy rozwinięciu wyświetlane są pełna treść przepisu i jego wartość odżywcza

- ID: US-008
  Tytuł: Obsługa błędów generowania
  Opis: Jako użytkownik chcę, aby w przypadku błędu AI lub API zostać powróconym do formularza z komunikatem o błędzie.
  Kryteria akceptacji:
  - w przypadku błędu generowania usuwany jest loader
  - użytkownik pozostaje w formularzu
  - wyświetlany jest komunikat Wystąpił problem podczas modyfikacji twojego przepisu, spróbuj ponownie

- ID: US-009
  Tytuł: Bezpieczny dostęp do zasobów
  Opis: Jako użytkownik chcę, aby moje przepisy były dostępne wyłącznie dla mnie.
  Kryteria akceptacji:
  - dostęp do listy i szczegółów przepisu wymaga uwierzytelnienia
  - próba dostępu do przepisu innego użytkownika zwraca błąd 403
  - walidacja po stronie serwera (RLS)

## 6. Metryki sukcesu
1. 90% użytkowników posiada w profilu uzupełnione preferencje żywieniowe
2. 75% użytkowników generuje co najmniej jeden przepis tygodniowo
3. Czas generowania AI ≤10 sekund w 95% przypadków