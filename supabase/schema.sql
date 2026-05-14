-- ──────────────────────────────────────────────────────────────────────
-- Local Delivery Storefront — Supabase schema + RLS
--
-- Run this in the Supabase SQL editor on a fresh project. Order matters
-- (enums → tables → policies → triggers). Re-running should be idempotent.
-- ──────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── enums ────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('customer', 'admin', 'courier');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('pending', 'approved', 'denied');
exception when duplicate_object then null; end $$;

do $$ begin
  create type garment_size as enum ('S', 'M', 'L', 'XL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fulfillment_kind as enum ('delivery', 'pickup');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('received', 'packed', 'out_for_delivery', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

-- ── profiles ─────────────────────────────────────────────────────────
-- One row per auth.users row. Created via trigger on signup.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,
  age_confirmed_at timestamptz,
  role user_role not null default 'customer',
  status account_status not null default 'pending',
  invite_code_used text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_role_idx on public.profiles(role);

-- Personal referral code per customer. NULL for admin/courier.
alter table public.profiles
  add column if not exists referral_code text unique;

-- ── invite_codes ─────────────────────────────────────────────────────
-- Optional admin-issued or customer-referral codes. Tracks usage.
create table if not exists public.invite_codes (
  code text primary key,
  created_by uuid references public.profiles(id) on delete set null,
  max_uses integer not null default 1,
  uses integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── products ─────────────────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color_accent text not null default '#888881',
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_idx on public.products(active);

-- Per-size pricing. Price stored in cents.
create table if not exists public.product_sizes (
  product_id uuid not null references public.products(id) on delete cascade,
  size garment_size not null,
  price_cents integer not null check (price_cents >= 0),
  available boolean not null default true,
  primary key (product_id, size)
);

-- ── orders ───────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  fulfillment fulfillment_kind not null,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  delivery_distance_miles numeric(6,2),
  delivery_window text,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  status order_status not null default 'received',
  payment_status payment_status not null default 'pending',
  payment_method text not null default 'stripe',
  stripe_session_id text,
  stripe_payment_intent text,
  courier_id uuid references public.profiles(id) on delete set null,
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_courier_idx on public.orders(courier_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name_snapshot text not null,
  size garment_size not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0)
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- ── delivery_photos ──────────────────────────────────────────────────
create table if not exists public.delivery_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  courier_id uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists delivery_photos_order_idx on public.delivery_photos(order_id);

-- ── updated_at trigger helper ────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- ── auth user → profile bootstrap ────────────────────────────────────
-- When a new auth.users row appears, copy first_name/last_name/phone/dob
-- and the optional invite code from raw_user_meta_data into profiles.
create or replace function public.handle_new_user() returns trigger as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_referral text := encode(gen_random_bytes(4), 'hex');
begin
  insert into public.profiles (
    id, email, first_name, last_name, phone, date_of_birth, age_confirmed_at,
    invite_code_used, referral_code
  ) values (
    new.id,
    new.email,
    meta->>'first_name',
    meta->>'last_name',
    meta->>'phone',
    nullif(meta->>'date_of_birth','')::date,
    case when (meta->>'age_confirmed')::boolean then now() else null end,
    nullif(meta->>'invite_code',''),
    v_referral
  )
  on conflict (id) do nothing;
  return new;
end $$ language plpgsql security definer;

drop trigger if exists trg_new_user on auth.users;
create trigger trg_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── helper: is_admin / is_courier ────────────────────────────────────
create or replace function public.current_role_is(target user_role)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = target
  );
$$;

create or replace function public.current_is_approved()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.invite_codes  enable row level security;
alter table public.products      enable row level security;
alter table public.product_sizes enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.delivery_photos enable row level security;

-- profiles: a user can see/update their own row; admin sees all.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (auth.uid() = id or public.current_role_is('admin'));

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

-- invite_codes: admins manage; customers can SELECT a code only to validate
-- (handled at API layer via service role for safety — here, admin-only).
drop policy if exists invite_codes_admin_all on public.invite_codes;
create policy invite_codes_admin_all on public.invite_codes
  for all using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

-- products / product_sizes: visible to approved users; admin can write.
drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (public.current_is_approved() and active = true);

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

drop policy if exists product_sizes_read on public.product_sizes;
create policy product_sizes_read on public.product_sizes
  for select using (
    public.current_is_approved()
    and exists (select 1 from public.products p where p.id = product_id and p.active = true)
  );

drop policy if exists product_sizes_admin_all on public.product_sizes;
create policy product_sizes_admin_all on public.product_sizes
  for all using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

-- orders: customers see their own. Admins see all. Couriers see assigned.
drop policy if exists orders_self_select on public.orders;
create policy orders_self_select on public.orders
  for select using (
    auth.uid() = customer_id
    or public.current_role_is('admin')
    or (public.current_role_is('courier') and courier_id = auth.uid())
  );

-- Direct inserts/updates from clients are blocked; the API uses service role.
drop policy if exists orders_no_client_write on public.orders;
create policy orders_no_client_write on public.orders
  for all using (false) with check (false);

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or public.current_role_is('admin')
          or (public.current_role_is('courier') and o.courier_id = auth.uid())
        )
    )
  );

drop policy if exists order_items_no_client_write on public.order_items;
create policy order_items_no_client_write on public.order_items
  for all using (false) with check (false);

-- delivery_photos: visible to admin and the assigned courier; customer may
-- view their own delivery photo via signed URL through the API.
drop policy if exists delivery_photos_select on public.delivery_photos;
create policy delivery_photos_select on public.delivery_photos
  for select using (
    public.current_role_is('admin')
    or (public.current_role_is('courier') and courier_id = auth.uid())
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );

drop policy if exists delivery_photos_no_client_write on public.delivery_photos;
create policy delivery_photos_no_client_write on public.delivery_photos
  for all using (false) with check (false);

-- ── storage: delivery photos bucket ──────────────────────────────────
-- Run once: create a private bucket named `delivery-photos` in the
-- Supabase Storage UI, or via:
--   insert into storage.buckets (id, name, public) values ('delivery-photos', 'delivery-photos', false);
-- Access happens via signed URLs issued by the server.

-- ── seed: example product (delete in prod) ───────────────────────────
-- insert into public.products (name, description, color_accent)
--   values ('Sample piece', 'Member-only release.', '#7c3aed')
--   returning id;
