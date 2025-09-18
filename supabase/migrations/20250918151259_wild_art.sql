-- Schéma minimal pour ReservAT (idempotent)

-- 1) Profiles (lien avec auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz not null default now()
);

-- Ajouter colonnes si manquantes
alter table public.profiles
  add column if not exists email text;

create index if not exists idx_profiles_email on public.profiles(email);

-- 2) Uploads (un envoi = un fichier transmis à n8n)
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text,
  mime_type text,
  size_bytes bigint,
  n8n_request_id text,
  status text check (status in ('received','processing','ocr_done','validated','error')) default 'received',
  created_at timestamptz not null default now()
);

alter table public.uploads
  add column if not exists filename text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists n8n_request_id text,
  add column if not exists status text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_uploads_user on public.uploads(user_id);
create index if not exists idx_uploads_status on public.uploads(status);

-- 3) OCR results (résultat brut/structuré renvoyé par n8n)
create table if not exists public.ocr_results (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.uploads(id) on delete cascade,
  data jsonb not null default '{}',
  extracted_at timestamptz not null default now()
);

alter table public.ocr_results
  add column if not exists data jsonb not null default '{}',
  add column if not exists extracted_at timestamptz not null default now();

create index if not exists idx_ocr_upload on public.ocr_results(upload_id);
create index if not exists idx_ocr_gin on public.ocr_results using gin (data);

-- 4) Validations (données corrigées/validées par l'utilisateur)
create table if not exists public.validations (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.uploads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  is_confirmed boolean not null default false,
  confirmed_at timestamptz
);

alter table public.validations
  add column if not exists data jsonb not null default '{}',
  add column if not exists is_confirmed boolean not null default false,
  add column if not exists confirmed_at timestamptz;

create index if not exists idx_validations_user on public.validations(user_id);
create index if not exists idx_validations_upload on public.validations(upload_id);

-- 5) Payments (trace de la session de paiement)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid references public.uploads(id) on delete set null,
  stripe_session_id text unique,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EUR',
  status text not null check (status in ('created','paid','failed','refunded')) default 'created',
  created_at timestamptz not null default now()
);

alter table public.payments
  add column if not exists stripe_session_id text,
  add column if not exists amount_cents integer,
  add column if not exists currency text not null default 'EUR',
  add column if not exists status text not null default 'created',
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_upload on public.payments(upload_id);

-- ========================
-- Row Level Security (RLS)
-- ========================
alter table public.profiles enable row level security;
alter table public.uploads enable row level security;
alter table public.ocr_results enable row level security;
alter table public.validations enable row level security;
alter table public.payments enable row level security;

-- Supprimer anciennes policies nommées pareil si elles existent (idempotence soft)
do $$
begin
  -- profiles
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_self') then
    execute 'drop policy profiles_select_self on public.profiles';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_ins_self') then
    execute 'drop policy profiles_ins_self on public.profiles';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_upd_self') then
    execute 'drop policy profiles_upd_self on public.profiles';
  end if;

  -- uploads
  if exists (select 1 from pg_policies where schemaname='public' and tablename='uploads' and policyname='uploads_select_owner') then
    execute 'drop policy uploads_select_owner on public.uploads';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='uploads' and policyname='uploads_ins_self') then
    execute 'drop policy uploads_ins_self on public.uploads';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='uploads' and policyname='uploads_upd_owner') then
    execute 'drop policy uploads_upd_owner on public.uploads';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='uploads' and policyname='uploads_del_owner') then
    execute 'drop policy uploads_del_owner on public.uploads';
  end if;

  -- ocr_results
  if exists (select 1 from pg_policies where schemaname='public' and tablename='ocr_results' and policyname='ocr_select_owner') then
    execute 'drop policy ocr_select_owner on public.ocr_results';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='ocr_results' and policyname='ocr_ins_owner_upload') then
    execute 'drop policy ocr_ins_owner_upload on public.ocr_results';
  end if;

  -- validations
  if exists (select 1 from pg_policies where schemaname='public' and tablename='validations' and policyname='val_select_owner') then
    execute 'drop policy val_select_owner on public.validations';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='validations' and policyname='val_ins_self') then
    execute 'drop policy val_ins_self on public.validations';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='validations' and policyname='val_upd_owner') then
    execute 'drop policy val_upd_owner on public.validations';
  end if;

  -- payments
  if exists (select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='pay_select_owner') then
    execute 'drop policy pay_select_owner on public.payments';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='pay_ins_self') then
    execute 'drop policy pay_ins_self on public.payments';
  end if;
end$$;

-- Profiles policies
create policy profiles_select_self on public.profiles
for select using (auth.uid() = id);

create policy profiles_ins_self on public.profiles
for insert with check (auth.uid() = id);

create policy profiles_upd_self on public.profiles
for update using (auth.uid() = id);

-- Uploads policies
create policy uploads_select_owner on public.uploads
for select using (auth.uid() = user_id);

create policy uploads_ins_self on public.uploads
for insert with check (auth.uid() = user_id);

create policy uploads_upd_owner on public.uploads
for update using (auth.uid() = user_id);

create policy uploads_del_owner on public.uploads
for delete using (auth.uid() = user_id);

-- OCR results: lecture si propriétaire de l'upload lié
create policy ocr_select_owner on public.ocr_results
for select using (
  exists (
    select 1 from public.uploads u
    where u.id = ocr_results.upload_id and u.user_id = auth.uid()
  )
);

-- Insertion: seulement si propriétaire de l'upload (via n8n service role côté backend, ou via RPC sécurisée)
create policy ocr_ins_owner_upload on public.ocr_results
for insert with check (
  exists (
    select 1 from public.uploads u
    where u.id = upload_id and u.user_id = auth.uid()
  )
);

-- Validations policies
create policy val_select_owner on public.validations
for select using (auth.uid() = user_id);

create policy val_ins_self on public.validations
for insert with check (auth.uid() = user_id);

create policy val_upd_owner on public.validations
for update using (auth.uid() = user_id);

-- Payments policies
create policy pay_select_owner on public.payments
for select using (auth.uid() = user_id);

create policy pay_ins_self on public.payments
for insert with check (auth.uid() = user_id);