-- ============================================================
-- جدول العروض/الخصومات
-- يدعم نوعين: خصم على صنف محدد (item) أو برومو كود على كامل الطلب (order)
-- وطريقتين للخصم: نسبة مئوية (percentage) أو مبلغ ثابت (fixed)
-- ============================================================

create type public.offer_scope as enum ('item', 'order');
create type public.discount_kind as enum ('percentage', 'fixed');

create table public.offers (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  title          text not null,
  title_ar       text,
  scope          public.offer_scope not null,
  discount_kind  public.discount_kind not null,
  discount_value numeric(10,2) not null check (discount_value > 0),

  -- مطلوب فقط عندما scope = 'item'
  item_id        uuid references public.menu_items(id) on delete cascade,

  -- مطلوب فقط عندما scope = 'order' — فريد لكل مطعم على حدة
  promo_code     text,

  is_active      boolean not null default true,
  starts_at      timestamptz,
  ends_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint offers_item_scope_requires_item
    check (scope <> 'item' or item_id is not null),
  constraint offers_order_scope_requires_promo
    check (scope <> 'order' or (promo_code is not null and length(promo_code) > 0)),
  constraint offers_percentage_max_100
    check (discount_kind <> 'percentage' or discount_value <= 100)
);

create index idx_offers_restaurant on public.offers (restaurant_id);
create index idx_offers_item on public.offers (item_id);
create unique index idx_offers_promo_per_restaurant
  on public.offers (restaurant_id, lower(promo_code))
  where promo_code is not null;

create trigger trg_offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

alter table public.offers enable row level security;

create policy "staff can manage offers"
  on public.offers for all
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

-- قراءة عامة اختيارية للعروض الفعّالة (مفيدة لاحقاً عند عرض الخصومات في منيو الزبون)
create policy "public can read active offers"
  on public.offers for select
  using (is_active = true);
