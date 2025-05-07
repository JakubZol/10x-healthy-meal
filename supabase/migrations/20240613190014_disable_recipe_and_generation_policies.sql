-- migration: 20240613190014_disable_recipe_and_generation_policies.sql
-- description: disables all rls policies for recipes, generations, and generations_error_logs tables
-- this migration is meant to be applied after the initial schema creation

-- drop policies for recipes table
drop policy if exists "authenticated users can view their own recipes" on recipes;
drop policy if exists "authenticated users can insert their own recipes" on recipes;
drop policy if exists "authenticated users can update their own recipes" on recipes;
drop policy if exists "authenticated users can delete their own recipes" on recipes;

-- drop policies for generations table
drop policy if exists "authenticated users can view their own generations" on generations;
drop policy if exists "authenticated users can insert their own generations" on generations;
drop policy if exists "authenticated users can update their own generations" on generations;
drop policy if exists "authenticated users can delete their own generations" on generations;

-- drop policies for generations_error_logs table
drop policy if exists "authenticated users can view their own error logs" on generations_error_logs;
drop policy if exists "authenticated users can insert their own error logs" on generations_error_logs;
drop policy if exists "authenticated users can update their own error logs" on generations_error_logs;
drop policy if exists "authenticated users can delete their own error logs" on generations_error_logs;

-- add comment explaining the absence of policies
comment on table recipes is 'User recipes with original and AI-modified versions (RLS policies disabled)';
comment on table generations is 'Records of AI recipe generation attempts and statistics (RLS policies disabled)';
comment on table generations_error_logs is 'Error logs from AI recipe generation attempts (RLS policies disabled)';

-- note: row level security is still enabled on these tables, but there are no policies
-- this effectively blocks all access until new policies are added or RLS is disabled

alter table recipes disable row level security;
alter table generations disable row level security;
alter table generations_error_logs disable row level security;
