-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================
create type public.staff_role as enum ('owner', 'manager', 'staff');
create type public.theme_mode as enum ('light', 'dark', 'system');

-- ============================================================
-- 2. CORE TABLES
-- ============================================================

create table public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  name_ar     text,
  owner_id    uuid not null references auth.users(id) on delete restrict,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_restaurants_slug on public.restaurants (slug);
create index idx_restaurants_owner on public.restaurants (owner_id);

create table public.restaurant_staff (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  role           public.staff_role not null default 'staff',
  created_at     timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index idx_staff_restaurant on public.restaurant_staff (restaurant_id);
create index idx_staff_user on public.restaurant_staff (user_id);

create table public.menu_categories (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  name           text not null,
  name_ar        text,
  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_categories_restaurant on public.menu_categories (restaurant_id, sort_order);

create table public.menu_items (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  category_id    uuid not null references public.menu_categories(id) on delete cascade,
  name           text not null,
  name_ar        text,
  description    text,
  description_ar text,
  price          numeric(10,2) not null check (price >= 0),
  image_path     text,
  is_available   boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_items_restaurant on public.menu_items (restaurant_id);
create index idx_items_category on public.menu_items (category_id, sort_order);
create index idx_items_available on public.menu_items (restaurant_id, is_available);

create table public.menu_item_option_groups (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.menu_items(id) on delete cascade,
  name        text not null,
  name_ar     text,
  is_required boolean not null default false,
  max_select  integer not null default 1,
  sort_order  integer not null default 0
);

create index idx_option_groups_item on public.menu_item_option_groups (item_id, sort_order);

create table public.menu_item_options (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.menu_item_option_groups(id) on delete cascade,
  name        text not null,
  name_ar     text,
  price_delta numeric(10,2) not null default 0,
  sort_order  integer not null default 0
);

create index idx_options_group on public.menu_item_options (group_id, sort_order);

create table public.restaurant_tables (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  label          text not null,
  qr_token       text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at     timestamptz not null default now()
);

create index idx_tables_restaurant on public.restaurant_tables (restaurant_id);

-- إعدادات الهوية البصرية / الثيم (ألوان أساسية وثانوية، شعار، نمط المنيو)
create table public.restaurant_branding (
  restaurant_id   uuid primary key references public.restaurants(id) on delete cascade,
  logo_path       text,
  cover_path      text,
  primary_color   text not null default '#0ea5e9',
  accent_color    text not null default '#f97316',
  theme_mode      public.theme_mode not null default 'dark',
  menu_style      text not null default 'classic-grid', -- معرّف أحد القوالب العشرة الجاهزة (انظر MENU_TEMPLATES في الكود)
  font_family     text not null default 'Cairo',
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 3. updated_at TRIGGER
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_restaurants_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();
create trigger trg_categories_updated_at before update on public.menu_categories
  for each row execute function public.set_updated_at();
create trigger trg_items_updated_at before update on public.menu_items
  for each row execute function public.set_updated_at();
create trigger trg_branding_updated_at before update on public.restaurant_branding
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. HELPER FUNCTIONS (security definer لتجنب تكرار RLS)
-- ============================================================
create or replace function public.is_restaurant_staff(target_restaurant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.restaurant_staff s
    where s.restaurant_id = target_restaurant_id
      and s.user_id = auth.uid()
  );
$$;

create or replace function public.is_restaurant_owner(target_restaurant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.restaurant_staff s
    where s.restaurant_id = target_restaurant_id
      and s.user_id = auth.uid()
      and s.role in ('owner', 'manager')
  );
$$;

-- ============================================================
-- 5. تفعيل RLS
-- ============================================================
alter table public.restaurants enable row level security;
alter table public.restaurant_staff enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_option_groups enable row level security;
alter table public.menu_item_options enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.restaurant_branding enable row level security;

-- ============================================================
-- 6. سياسات RLS
-- ============================================================

create policy "public can read active restaurants"
  on public.restaurants for select
  using (is_active = true);

create policy "staff can read own restaurant always"
  on public.restaurants for select
  using (public.is_restaurant_staff(id));

create policy "owner/manager can update restaurant"
  on public.restaurants for update
  using (public.is_restaurant_owner(id));

create policy "authenticated user can create restaurant"
  on public.restaurants for insert
  with check (auth.uid() = owner_id);

create policy "staff can view own restaurant team"
  on public.restaurant_staff for select
  using (public.is_restaurant_staff(restaurant_id));

-- يسمح بإدراج أول صف عضوية (owner) مباشرة بعد إنشاء المطعم من التطبيق
create policy "user can self-insert as staff of a restaurant they own"
  on public.restaurant_staff for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "owner/manager can manage staff"
  on public.restaurant_staff for all
  using (public.is_restaurant_owner(restaurant_id))
  with check (public.is_restaurant_owner(restaurant_id));

create policy "public can read active categories"
  on public.menu_categories for select
  using (is_active = true);

create policy "staff can manage categories"
  on public.menu_categories for all
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

create policy "public can read available items"
  on public.menu_items for select
  using (is_available = true);

create policy "staff can manage items"
  on public.menu_items for all
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

create policy "public can read option groups"
  on public.menu_item_option_groups for select
  using (true);

create policy "staff can manage option groups"
  on public.menu_item_option_groups for all
  using (
    exists (
      select 1 from public.menu_items i
      where i.id = item_id and public.is_restaurant_staff(i.restaurant_id)
    )
  )
  with check (
    exists (
      select 1 from public.menu_items i
      where i.id = item_id and public.is_restaurant_staff(i.restaurant_id)
    )
  );

create policy "public can read options"
  on public.menu_item_options for select
  using (true);

create policy "staff can manage options"
  on public.menu_item_options for all
  using (
    exists (
      select 1 from public.menu_item_option_groups g
      join public.menu_items i on i.id = g.item_id
      where g.id = group_id and public.is_restaurant_staff(i.restaurant_id)
    )
  )
  with check (
    exists (
      select 1 from public.menu_item_option_groups g
      join public.menu_items i on i.id = g.item_id
      where g.id = group_id and public.is_restaurant_staff(i.restaurant_id)
    )
  );

create policy "staff can manage tables"
  on public.restaurant_tables for all
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

create policy "public can read branding"
  on public.restaurant_branding for select
  using (true);

create policy "staff can manage branding"
  on public.restaurant_branding for all
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

-- ============================================================
-- 7. STORAGE BUCKET: menu-images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

create policy "public read menu-images"
  on storage.objects for select
  using (bucket_id = 'menu-images');

create policy "staff can upload menu-images"
  on storage.objects for insert
  with check (
    bucket_id = 'menu-images'
    and public.is_restaurant_staff((storage.foldername(name))[1]::uuid)
  );

create policy "staff can update menu-images"
  on storage.objects for update
  using (
    bucket_id = 'menu-images'
    and public.is_restaurant_staff((storage.foldername(name))[1]::uuid)
  );

create policy "staff can delete menu-images"
  on storage.objects for delete
  using (
    bucket_id = 'menu-images'
    and public.is_restaurant_staff((storage.foldername(name))[1]::uuid)
  );
