-- إدارة الطلبات: رابط المنيو، التسلسل اليومي، والأرشفة.

alter table public.restaurants add column if not exists slug text;

-- Existing installations predating the original slug column receive a stable fallback.
update public.restaurants
set slug = concat('restaurant-', replace(id::text, '-', ''))
where slug is null or btrim(slug) = '';

alter table public.restaurants alter column slug set not null;
create unique index if not exists idx_restaurants_slug_unique
  on public.restaurants (slug);

alter table public.orders
  add column if not exists daily_sequence integer,
  add column if not exists is_archived boolean not null default false;

-- Give historical orders a deterministic number before enforcing the new constraint.
with ranked_orders as (
  select
    id,
    row_number() over (
      partition by restaurant_id, (created_at at time zone 'Asia/Baghdad')::date
      order by created_at, id
    )::integer as sequence_number
  from public.orders
  where daily_sequence is null
)
update public.orders orders
set daily_sequence = ranked_orders.sequence_number
from ranked_orders
where orders.id = ranked_orders.id;

create or replace function public.assign_order_daily_sequence()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_order_date date := (new.created_at at time zone 'Asia/Baghdad')::date;
begin
  -- Serialise allocation per restaurant/day, while the unique index remains the final guard.
  perform pg_advisory_xact_lock(hashtext(new.restaurant_id::text || ':' || v_order_date::text));

  select coalesce(max(daily_sequence), 0) + 1
    into new.daily_sequence
  from public.orders
  where restaurant_id = new.restaurant_id
    and (created_at at time zone 'Asia/Baghdad')::date = v_order_date;

  return new;
end;
$$;

drop trigger if exists trg_assign_order_daily_sequence on public.orders;
create trigger trg_assign_order_daily_sequence
  before insert on public.orders
  for each row execute function public.assign_order_daily_sequence();

alter table public.orders alter column daily_sequence set not null;
alter table public.orders
  add constraint orders_daily_sequence_positive check (daily_sequence > 0);

create unique index if not exists idx_orders_daily_sequence
  on public.orders (
    restaurant_id,
    ((created_at at time zone 'Asia/Baghdad')::date),
    daily_sequence
  );
create index if not exists idx_orders_active_dashboard
  on public.orders (restaurant_id, created_at desc)
  where is_archived = false;

drop policy if exists "staff can delete own restaurant orders" on public.orders;
create policy "staff can delete own restaurant orders"
  on public.orders for delete
  using (public.is_restaurant_staff(restaurant_id));

create or replace function public.archive_todays_orders(p_restaurant_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_archived_count integer;
begin
  update public.orders
  set is_archived = true
  where restaurant_id = p_restaurant_id
    and is_archived = false
    and (created_at at time zone 'Asia/Baghdad')::date =
      (now() at time zone 'Asia/Baghdad')::date;

  get diagnostics v_archived_count = row_count;
  return v_archived_count;
end;
$$;

grant execute on function public.archive_todays_orders(uuid) to authenticated;

-- Postgres Changes only emits rows for tables included in this publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'orders'
    ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;

-- The seven-argument overload is the public RPC contract used by the menu.
-- The sequence is assigned by the insert trigger above, then returned to the client.
create or replace function public.create_public_order(
  p_restaurant_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb,
  p_promo_code text,
  p_delivery_zone_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zone record;
  v_result jsonb;
  v_order_id uuid;
  v_subtotal numeric(10,2);
  v_sequence integer;
  v_delivery_zone_name text;
begin
  if not public.restaurant_is_accepting_orders(p_restaurant_id) then
    raise exception 'المطعم مغلق حاليًا أو خارج أوقات التشغيل.' using errcode = '22023';
  end if;

  if p_delivery_zone_id is not null then
    select id, name, delivery_fee, minimum_order into v_zone
    from public.delivery_zones
    where id = p_delivery_zone_id
      and restaurant_id = p_restaurant_id
      and is_active;
    if not found then
      raise exception 'منطقة التوصيل غير متاحة.' using errcode = '22023';
    end if;
    v_delivery_zone_name := v_zone.name;
  end if;

  -- Six arguments intentionally select the private pricing implementation from 0004.
  v_result := public.create_public_order(
    p_restaurant_id,
    p_customer_name,
    p_customer_phone,
    p_customer_address,
    p_items,
    p_promo_code
  );
  v_order_id := (v_result ->> 'id')::uuid;
  v_subtotal := (v_result ->> 'total_amount')::numeric;

  if p_delivery_zone_id is not null and v_subtotal < v_zone.minimum_order then
    delete from public.orders where id = v_order_id;
    raise exception 'الحد الأدنى لهذه المنطقة هو % د.ع.', v_zone.minimum_order using errcode = '22023';
  end if;

  update public.orders
  set delivery_zone_id = p_delivery_zone_id,
      delivery_fee = coalesce(v_zone.delivery_fee, 0),
      total_amount = total_amount + coalesce(v_zone.delivery_fee, 0)
  where id = v_order_id
  returning daily_sequence into v_sequence;

  return v_result || jsonb_build_object(
    'daily_sequence', v_sequence,
    'delivery_zone_name', v_delivery_zone_name,
    'delivery_fee', coalesce(v_zone.delivery_fee, 0),
    'total_amount', v_subtotal + coalesce(v_zone.delivery_fee, 0)
  );
end;
$$;

revoke all on function public.create_public_order(uuid, text, text, text, jsonb, text) from anon, authenticated;
grant execute on function public.create_public_order(uuid, text, text, text, jsonb, text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
