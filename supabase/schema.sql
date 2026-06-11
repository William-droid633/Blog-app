-- ============================================================
-- Schéma complet du blog Herkul — à exécuter dans
-- Supabase → SQL Editor → New query → coller → Run
-- ============================================================

-- 1) Table des articles
create table posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text,
  slug text unique not null,
  cover_image text,
  published boolean default false,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2) Trigger : met à jour updated_at à chaque modification
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
before update on posts
for each row execute function update_updated_at();

-- 3) Row Level Security
alter table posts enable row level security;

-- Lecture publique des articles publiés uniquement
create policy "Public can read published posts"
on posts for select
using (published = true);

-- Toutes les opérations pour les utilisateurs connectés
create policy "Authenticated users have full access"
on posts for all
using (auth.role() = 'authenticated');

-- ============================================================
-- 4) Politiques du bucket Storage `images`
--    (crée d'abord le bucket PUBLIC nommé `images` dans
--     Storage → New bucket, puis exécute ceci)
-- ============================================================

create policy "Public can view images"
on storage.objects for select
using (bucket_id = 'images');

create policy "Authenticated users can upload images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'images');

create policy "Authenticated users can update images"
on storage.objects for update
to authenticated
using (bucket_id = 'images');

create policy "Authenticated users can delete images"
on storage.objects for delete
to authenticated
using (bucket_id = 'images');
