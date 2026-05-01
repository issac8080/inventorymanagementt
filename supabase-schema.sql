-- Initra: Supabase cloud backend (run in Supabase SQL Editor after creating a project).
-- Also add Storage bucket named `warranties` (private). Policies below reference it.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth user; created by trigger on signup)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  login_key text not null,
  username text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.initra_profile_login_key()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, login_key, username, is_admin)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'login_key'), ''), new.email),
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false)
  )
  on conflict (id) do update set
    login_key = excluded.login_key,
    username = excluded.username;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_initra on auth.users;

create trigger on_auth_user_created_initra
  after insert on auth.users
  for each row execute function public.initra_profile_login_key();

-- RLS: read own row; admins read all; insert handled by trigger (service); users update own display name
create policy "profiles_select" on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated
  using (
    id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "profiles_delete_admin" on public.profiles for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ---------------------------------------------------------------------------
-- Products (same logical fields as Firestore)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id text primary key,
  owner_uid uuid not null references auth.users (id) on delete cascade,
  user_mobile text not null,
  item_code text not null,
  name text not null,
  category text not null,
  barcode text,
  qr_value text not null default '',
  warranty_start timestamptz,
  warranty_end timestamptz,
  warranty_duration integer,
  location text,
  notes text,
  purchase_price double precision,
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_owner_uid_idx on public.products (owner_uid);
create index if not exists products_user_mobile_idx on public.products (user_mobile);
create index if not exists products_item_code_idx on public.products (item_code);

alter table public.products enable row level security;

create policy "products_select" on public.products for select to authenticated
  using (
    owner_uid = auth.uid()
    or user_mobile = (select login_key from public.profiles where id = auth.uid())
  );

create policy "products_insert" on public.products for insert to authenticated
  with check (
    owner_uid = auth.uid()
    and user_mobile = (select login_key from public.profiles where id = auth.uid())
  );

create policy "products_update" on public.products for update to authenticated
  using (
    owner_uid = auth.uid()
    or user_mobile = (select login_key from public.profiles where id = auth.uid())
  );

create policy "products_delete" on public.products for delete to authenticated
  using (
    owner_uid = auth.uid()
    or user_mobile = (select login_key from public.profiles where id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Warranty documents + Storage bucket `warranties`
-- ---------------------------------------------------------------------------
create table if not exists public.warranty_documents (
  id text primary key,
  owner_uid uuid not null references auth.users (id) on delete cascade,
  user_mobile text not null,
  product_id text not null,
  storage_path text,
  download_url text,
  image_data text,
  extracted_text text,
  created_at timestamptz not null default now()
);

create index if not exists warranty_product_idx on public.warranty_documents (product_id);

alter table public.warranty_documents enable row level security;

create policy "warranty_select" on public.warranty_documents for select to authenticated
  using (
    owner_uid = auth.uid()
    or user_mobile = (select login_key from public.profiles where id = auth.uid())
  );

create policy "warranty_insert" on public.warranty_documents for insert to authenticated
  with check (
    owner_uid = auth.uid()
    and user_mobile = (select login_key from public.profiles where id = auth.uid())
  );

create policy "warranty_update" on public.warranty_documents for update to authenticated
  using (
    owner_uid = auth.uid()
    or user_mobile = (select login_key from public.profiles where id = auth.uid())
  );

create policy "warranty_delete" on public.warranty_documents for delete to authenticated
  using (
    owner_uid = auth.uid()
    or user_mobile = (select login_key from public.profiles where id = auth.uid())
  );

-- Storage: create bucket `warranties` in Dashboard, then:
-- (Adjust if your Supabase version uses a different storage policy UI.)

insert into storage.buckets (id, name, public)
values ('warranties', 'warranties', false)
on conflict (id) do nothing;

create policy "warranties_read_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'warranties' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "warranties_write_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'warranties' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "warranties_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'warranties' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "warranties_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'warranties' and (storage.foldername(name))[1] = auth.uid()::text);

-- First admin (after you sign up once, replace the email):
-- update public.profiles set is_admin = true where login_key = 'you@example.com';
