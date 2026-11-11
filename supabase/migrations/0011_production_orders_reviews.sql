-- Production hardening: Realtime, archival, discount snapshots, and manual reviews.

create type public.discount_kind as enum ('percentage', 'fixed');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

alter table public.orders
  add column if not exists discount_kind public.discount_kind,
  add column if not exists discount_value numeric(10,2),
  add column if not exists discount_description text;

create or replace function public.archive_resolved_orders(p_restaurant_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  if not public.is_restaurant_owner(p_restaurant_id) then
    raise exception 'لا تملك صلاحية أرشفة طلبات هذا المطعم.' using errcode = '42501';
  end if;
  update public.orders
  set is_archived = true
  where restaurant_id = p_restaurant_id
    and is_archived = false
    and status in ('completed', 'cancelled');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
grant execute on function public.archive_resolved_orders(uuid) to authenticated;

create or replace function public.delete_delivery_menu_category(p_restaurant_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  if not public.is_restaurant_owner(p_restaurant_id) then
    raise exception 'لا تملك صلاحية حذف بيانات هذا المطعم.' using errcode = '42501';
  end if;
  delete from public.menu_categories
  where restaurant_id = p_restaurant_id
    and lower(btrim(coalesce(name_ar, name))) in ('دليفري', 'delivery');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
grant execute on function public.delete_delivery_menu_category(uuid) to authenticated;

create table if not exists public.menu_item_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  item_id uuid not null references public.menu_items(id) on delete cascade,
  review_text text not null check (char_length(btrim(review_text)) between 1 and 500),
  stars smallint not null check (stars between 1 and 5),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_menu_item_reviews_public on public.menu_item_reviews(item_id, is_visible, created_at desc);
alter table public.menu_item_reviews enable row level security;
create policy "public can read visible meal reviews" on public.menu_item_reviews for select using (is_visible);
create policy "staff can manage meal reviews" on public.menu_item_reviews for all
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));
create trigger trg_menu_item_reviews_updated_at before update on public.menu_item_reviews for each row execute function public.set_updated_at();

-- Keeps the review restaurant tied to the meal instead of trusting client input.
create or replace function public.sync_review_restaurant_id()
returns trigger language plpgsql set search_path = public as $$
begin
  select restaurant_id into new.restaurant_id from public.menu_items where id = new.item_id;
  if new.restaurant_id is null then raise exception 'الوجبة غير موجودة.'; end if;
  return new;
end;
$$;
drop trigger if exists trg_sync_review_restaurant_id on public.menu_item_reviews;
create trigger trg_sync_review_restaurant_id before insert or update of item_id on public.menu_item_reviews
  for each row execute function public.sync_review_restaurant_id();

-- Public order contract: address is required, percentage totals round to nearest IQD 250,
-- and discount metadata is snapshotted on the order for auditability.
create or replace function public.create_public_order(
  p_restaurant_id uuid, p_customer_name text, p_customer_phone text, p_customer_address text,
  p_items jsonb, p_promo_code text, p_delivery_zone_id uuid
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_zone record; v_result jsonb; v_order_id uuid; v_total numeric(10,2); v_discount numeric(10,2);
  v_base_total numeric(10,2); v_rounded_total numeric(10,2); v_sequence integer;
  v_delivery_zone_name text; v_code text; v_kind public.discount_kind; v_value numeric(10,2); v_description text;
begin
  if nullif(btrim(coalesce(p_customer_address, '')), '') is null then
    raise exception 'العنوان التفصيلي مطلوب.' using errcode = '22023';
  end if;
  if not public.restaurant_is_accepting_orders(p_restaurant_id) then
    raise exception 'المطعم مغلق حاليًا أو خارج أوقات التشغيل.' using errcode = '22023';
  end if;
  if p_delivery_zone_id is not null then
    select id, name, delivery_fee, minimum_order into v_zone from public.delivery_zones
    where id = p_delivery_zone_id and restaurant_id = p_restaurant_id and is_active;
    if not found then raise exception 'منطقة التوصيل غير متاحة.' using errcode = '22023'; end if;
    v_delivery_zone_name := v_zone.name;
  end if;
  v_result := public.create_public_order(p_restaurant_id, p_customer_name, p_customer_phone, p_customer_address, p_items, p_promo_code);
  v_order_id := (v_result ->> 'id')::uuid;
  select total_amount, discount_amount, discount_code into v_total, v_discount, v_code from public.orders where id = v_order_id;
  v_base_total := v_total + v_discount;
  if v_code is not null then
    select discount_kind, discount_value into v_kind, v_value from public.offers
    where restaurant_id = p_restaurant_id and scope = 'order' and is_active and lower(promo_code) = lower(v_code)
    limit 1;
    if v_kind = 'percentage' then
      v_rounded_total := round(v_total / 250) * 250;
      v_description := format('بروموكود %s: خصم %s%%', v_code, v_value);
    else
      v_rounded_total := v_total;
      v_description := format('بروموكود %s: خصم %s د.ع', v_code, v_value);
    end if;
  else
    v_rounded_total := v_total;
    if v_discount > 0 then v_description := 'خصم عروض الأصناف'; end if;
  end if;
  if p_delivery_zone_id is not null and v_rounded_total < v_zone.minimum_order then
    delete from public.orders where id = v_order_id;
    raise exception 'الحد الأدنى لهذه المنطقة هو % د.ع.', v_zone.minimum_order using errcode = '22023';
  end if;
  update public.orders set
    delivery_zone_id = p_delivery_zone_id,
    delivery_fee = coalesce(v_zone.delivery_fee, 0),
    total_amount = v_rounded_total + coalesce(v_zone.delivery_fee, 0),
    discount_amount = greatest(0, v_base_total - v_rounded_total),
    discount_kind = v_kind, discount_value = v_value, discount_description = v_description
  where id = v_order_id returning daily_sequence into v_sequence;
  return v_result || jsonb_build_object(
    'daily_sequence', v_sequence, 'delivery_zone_name', v_delivery_zone_name,
    'delivery_fee', coalesce(v_zone.delivery_fee, 0),
    'total_amount', v_rounded_total + coalesce(v_zone.delivery_fee, 0),
    'discount_amount', greatest(0, v_base_total - v_rounded_total),
    'discount_description', v_description
  );
end;
$$;

-- Call select public.delete_delivery_menu_category('<RESTAURANT_UUID>'); to remove “دليفري” and its cascading meals.

notify pgrst, 'reload schema';
