-- تشغيل المطعم ومناطق التوصيل. لا يحذف أو يغيّر أي من الجداول الحالية.
create table if not exists public.restaurant_operating_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  opens_at time,
  closes_at time,
  unique (restaurant_id, day_of_week),
  check ((is_open = false) or (opens_at is not null and closes_at is not null))
);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  minimum_order numeric(10,2) not null default 0 check (minimum_order >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  unique (restaurant_id, name)
);

create index if not exists idx_operating_hours_restaurant on public.restaurant_operating_hours(restaurant_id, day_of_week);
create index if not exists idx_delivery_zones_restaurant on public.delivery_zones(restaurant_id, sort_order);

alter table public.restaurant_operating_hours enable row level security;
alter table public.delivery_zones enable row level security;

create policy "staff manage operating hours" on public.restaurant_operating_hours for all
  using (public.is_restaurant_staff(restaurant_id)) with check (public.is_restaurant_staff(restaurant_id));
create policy "staff manage delivery zones" on public.delivery_zones for all
  using (public.is_restaurant_staff(restaurant_id)) with check (public.is_restaurant_staff(restaurant_id));
create policy "public read active delivery zones" on public.delivery_zones for select
  using (is_active and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.is_active));

alter table public.orders add column if not exists delivery_zone_id uuid references public.delivery_zones(id) on delete set null;
alter table public.orders add column if not exists delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0);

create or replace function public.restaurant_is_accepting_orders(p_restaurant_id uuid)
returns boolean language plpgsql security definer set search_path = public stable as $$
declare
  v_open boolean;
  v_day smallint;
  v_time time;
  v_schedule record;
begin
  select is_open into v_open from public.restaurants where id = p_restaurant_id and is_active;
  if coalesce(v_open, false) = false then return false; end if;
  -- Iraq local time: schedule is intentionally evaluated in the restaurant's operating timezone.
  v_day := extract(dow from (now() at time zone 'Asia/Baghdad'))::smallint;
  v_time := (now() at time zone 'Asia/Baghdad')::time;
  select * into v_schedule from public.restaurant_operating_hours where restaurant_id = p_restaurant_id and day_of_week = v_day;
  if not found then return true; end if; -- no schedule configured means manual switch controls ordering.
  if not v_schedule.is_open then return false; end if;
  if v_schedule.closes_at > v_schedule.opens_at then
    return v_time >= v_schedule.opens_at and v_time < v_schedule.closes_at;
  end if;
  -- shifts that cross midnight, e.g. 18:00–02:00
  return v_time >= v_schedule.opens_at or v_time < v_schedule.closes_at;
end;
$$;

-- Only this public entry point is exposed. It verifies manual status, hours and delivery-zone prices on the server.
create or replace function public.create_public_order_with_delivery(
  p_restaurant_id uuid, p_customer_name text, p_customer_phone text, p_customer_address text,
  p_items jsonb, p_promo_code text default null, p_delivery_zone_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_zone record;
  v_has_zone boolean := false;
  v_result jsonb;
  v_order_id uuid;
  v_subtotal numeric(10,2);
begin
  if not public.restaurant_is_accepting_orders(p_restaurant_id) then
    raise exception 'المطعم مغلق حاليًا أو خارج أوقات التشغيل.' using errcode = '22023';
  end if;
  if p_delivery_zone_id is not null then
    select id, delivery_fee, minimum_order into v_zone from public.delivery_zones
      where id = p_delivery_zone_id and restaurant_id = p_restaurant_id and is_active;
    if not found then raise exception 'منطقة التوصيل غير متاحة.' using errcode = '22023'; end if;
    v_has_zone := true;
  end if;
  v_result := public.create_public_order(p_restaurant_id, p_customer_name, p_customer_phone, p_customer_address, p_items, p_promo_code);
  v_order_id := (v_result ->> 'id')::uuid;
  v_subtotal := (v_result ->> 'total_amount')::numeric;
  if v_has_zone and v_subtotal < v_zone.minimum_order then
    delete from public.orders where id = v_order_id;
    raise exception 'الحد الأدنى لهذه المنطقة هو % د.ع.', v_zone.minimum_order using errcode = '22023';
  end if;
  update public.orders set delivery_zone_id = p_delivery_zone_id, delivery_fee = coalesce(v_zone.delivery_fee, 0), total_amount = total_amount + coalesce(v_zone.delivery_fee, 0) where id = v_order_id;
  return v_result || jsonb_build_object('delivery_fee', coalesce(v_zone.delivery_fee, 0), 'total_amount', v_subtotal + coalesce(v_zone.delivery_fee, 0));
end;
$$;

revoke all on function public.create_public_order(uuid, text, text, text, jsonb, text) from anon, authenticated;
grant execute on function public.create_public_order_with_delivery(uuid, text, text, text, jsonb, text, uuid) to anon, authenticated;
