# Plan schematu bazy danych

## 1. Tabele

### users
This table is managed by Supabase Auth

- id: UUID PRIMARY KEY
- email: VARCHAR (255) NOT NULL UNIQUE
- encrypted_password: VARCHAR NOT NULL
- created_at: TIMESTAMPZ NOT NULL DEFAULT now()
- confirmed_at: TIMESTAMPZ

### profiles
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
- preferences: VARCHAR(1000) NOT NULL CHECK (length(preferences) <= 1000)
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- modified_at: TIMESTAMPTZ NOT NULL DEFAULT now()

*Trigger: Automatically update `umodified_at` column on record updates.*

### recipes
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- title: VARCHAR(100) NOT NULL CHECK (length(title) <= 100)
- original_text: VARCHAR(10000) NOT NULL CHECK (length(original_text) <= 10000)
- modification_prompt: VARCHAR(500) NOT NULL CHECK (length(modification_prompt) <= 500)
- modified_text: VARCHAR(10000) NOT NULL CHECK (length(modified_text) <= 10000)
- generation_id: UUID NOT NULL REFERENCES generations(id) ON DELETE SET NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

### generations
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- model: VARCHAR(100) NOT NULL
- generated_count: INTEGER NOT NULL DEFAULT 0 CHECK (generated_count >= 0)
- accepted_count: INTEGER NULLABLE CHECK (accepted_edited_count >= 0)
- source_text_hash: VARCHAR(128) NOT NULL
- source_text_length: INTEGER NOT NULL
- created_at: TIMESTAMPZ NOT NULL DEFAULT now()

### generations_error_logs
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- model: VARCHAR(100) NOT NULL
- source_text_hash: VARCHAR(128) NOT NULL
- source_text_length: INTEGER NOT NULL
- error_code: VARCHAR(50) NOT NULL
- error_message: TEXT NOT NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

## 2. Relacje
- profiles.user_id → auth.users.id (1:1)
- recipes.user_id → auth.users.id (1:N)
- generations.user_id → auth.users.id (1:N)
- generations_error_logs.user_id → auth.users.id (1:N)

## 3. Indeksy
- profiles: unikalny indeks na user_id (constraint UNIQUE)
- recipes:
  - BTREE(user_id)
  - BTREE(created_at)
  - BTREE(user_id, created_at DESC)
- generations:
  - BTREE(user_id)
  - BTREE(source_text_hash)
- generations_error_logs:
  - BTREE(user_id, source_text_hash)

## 4. Polityki RLS
Włączyć Row-Level Security i dodać polityki ograniczające operacje do właściciela wiersza (`auth.uid() = user_id`):

```sql
-- Włącz RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations_error_logs ENABLE ROW LEVEL SECURITY;

-- Przykładowe polityki na tabeli profiles
CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY profiles_delete ON profiles
  FOR DELETE USING (user_id = auth.uid());

-- Analogiczne polityki dla pozostałych tabel: recipes, generations, generations_error_logs
```

## 5. Dodatkowe uwagi
- Użyć rozszerzenia `pgcrypto` do funkcji `gen_random_uuid()`.
- Stworzyć trigger na `profiles` aktualizujący `modified_at` przed każdą aktualizacją:
  ```sql
  CREATE OR REPLACE FUNCTION update_profiles_modified_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.modified_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  CREATE TRIGGER trg_profiles_modified_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profiles_modified_at();
  ```
- Zarządzać migracjami i rollbackami schematu przy użyciu Supabase CLI lub pg-migrate.
- Wszystkie kolumny TIMESTAMPTZ działają w UTC; konwersja stref czasowych odbywa się po stronie aplikacji.
- Fizyczne usuwanie powiązanych rekordów dzięki `ON DELETE CASCADE`; brak miękkich usunięć w MVP. 
