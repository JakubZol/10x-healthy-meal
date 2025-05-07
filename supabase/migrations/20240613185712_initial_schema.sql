-- migration: 20240613185712_initial_schema.sql
-- description: create initial database schema for HealthyMealAI
-- creates profiles, recipes, generations, and generations_error_logs tables
-- enables row level security on all tables
-- creates policies for authenticated users

-- enable pgcrypto extension for uuid generation
create extension if not exists "pgcrypto";

-- profiles table stores user dietary preferences
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  preferences varchar(1000) not null check (length(preferences) <= 1000),
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now()
);

-- function to automatically update modified_at timestamp on profiles
create or replace function update_profiles_modified_at()
returns trigger as $$
begin
  new.modified_at = now();
  return new;
end;
$$ language plpgsql;

-- trigger to update modified_at timestamp
create trigger trg_profiles_modified_at
  before update on profiles
  for each row
  execute function update_profiles_modified_at();

-- generations table stores statistics about AI recipe generations
create table generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model varchar(100) not null,
  generated_count integer not null default 0 check (generated_count >= 0),
  accepted_count integer check (accepted_count >= 0),
  source_text_hash varchar(128) not null,
  source_text_length integer not null,
  created_at timestamptz not null default now()
);

-- recipes table stores user recipes with original and AI-modified versions
create table recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title varchar(100) not null check (length(title) <= 100),
  original_text varchar(10000) not null check (length(original_text) <= 10000),
  modification_prompt varchar(500) not null check (length(modification_prompt) <= 500),
  modified_text varchar(10000) not null check (length(modified_text) <= 10000),
  generation_id uuid not null references generations(id) on delete set null,
  created_at timestamptz not null default now()
);

-- generations_error_logs table logs errors during recipe generation
create table generations_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model varchar(100) not null,
  source_text_hash varchar(128) not null,
  source_text_length integer not null,
  error_code varchar(50) not null,
  error_message text not null,
  created_at timestamptz not null default now()
);

-- create indexes for optimized access patterns
create index idx_recipes_user_id on recipes(user_id);
create index idx_recipes_created_at on recipes(created_at);
create index idx_recipes_user_id_created_at_desc on recipes(user_id, created_at desc);
create index idx_generations_user_id on generations(user_id);
create index idx_generations_source_text_hash on generations(source_text_hash);
create index idx_generations_error_logs_user_id_source_text_hash on generations_error_logs(user_id, source_text_hash);

-- enable row level security (rls) on all tables
alter table profiles enable row level security;
alter table recipes enable row level security;
alter table generations enable row level security;
alter table generations_error_logs enable row level security;

-- rls policies for profiles table
-- authenticated users can only manage their own profile
comment on table profiles is 'User dietary preferences for the HealthyMealAI application';

create policy "authenticated users can view their own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "authenticated users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "authenticated users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = user_id);

create policy "authenticated users can delete their own profile"
  on profiles for delete
  to authenticated
  using (auth.uid() = user_id);

-- rls policies for recipes table
-- authenticated users can only manage their own recipes
comment on table recipes is 'User recipes with original and AI-modified versions';

create policy "authenticated users can view their own recipes"
  on recipes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "authenticated users can insert their own recipes"
  on recipes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "authenticated users can update their own recipes"
  on recipes for update
  to authenticated
  using (auth.uid() = user_id);

create policy "authenticated users can delete their own recipes"
  on recipes for delete
  to authenticated
  using (auth.uid() = user_id);

-- rls policies for generations table
-- authenticated users can only manage their own generation records
comment on table generations is 'Records of AI recipe generation attempts and statistics';

create policy "authenticated users can view their own generations"
  on generations for select
  to authenticated
  using (auth.uid() = user_id);

create policy "authenticated users can insert their own generations"
  on generations for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "authenticated users can update their own generations"
  on generations for update
  to authenticated
  using (auth.uid() = user_id);

create policy "authenticated users can delete their own generations"
  on generations for delete
  to authenticated
  using (auth.uid() = user_id);

-- rls policies for generations_error_logs table
-- authenticated users can only manage their own error logs
comment on table generations_error_logs is 'Error logs from AI recipe generation attempts';

create policy "authenticated users can view their own error logs"
  on generations_error_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "authenticated users can insert their own error logs"
  on generations_error_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "authenticated users can update their own error logs"
  on generations_error_logs for update
  to authenticated
  using (auth.uid() = user_id);

create policy "authenticated users can delete their own error logs"
  on generations_error_logs for delete
  to authenticated
  using (auth.uid() = user_id);
