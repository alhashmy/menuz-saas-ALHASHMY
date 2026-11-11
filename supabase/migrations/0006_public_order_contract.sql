-- Canonical public order entry point. Its argument names match the browser RPC payload.
-- Keep the original six-argument function as an internal pricing primitive only.
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
begin
  if not public.restaurant_is_accepting_orders(p_restaurant_id) then
    raise exception 'المطعم مغلق حاليًا أو خارج أوقات التشغيل.' using errcode = '22023';
  end if;

  if p_delivery_zone_id is not null then
    select id, delivery_fee, minimum_order into v_zone
    from public.delivery_zones
    where id = p_delivery_zone_id
      and restaurant_id = p_restaurant_id
      and is_active;
    if not found then
      raise exception 'منطقة التوصيل غير متاحة.' using errcode = '22023';
    end if;
  end if;

  v_result := public.create_public_order(
    p_restaurant_id, p_customer_name, p_customer_phone, p_customer_address,
    p_items, p_promo_code
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
  where id = v_order_id;

  return v_result || jsonb_build_object(
    'delivery_fee', coalesce(v_zone.delivery_fee, 0),
    'total_amount', v_subtotal + coalesce(v_zone.delivery_fee, 0)
  );
end;
$$;

revoke all on function public.create_public_order(uuid, text, text, text, jsonb, text) from anon, authenticated;
grant execute on function public.create_public_order(uuid, text, text, text, jsonb, text, uuid) to anon, authenticated;
revoke all on function public.create_public_order_with_delivery(uuid, text, text, text, jsonb, text, uuid) from anon, authenticated;

-- Include the previous day's overnight shift (for example, 18:00–02:00).
create or replace function public.restaurant_is_accepting_orders(p_restaurant_id uuid)
returns boolean language plpgsql security definer set search_path = public stable as $$
declare
  v_open boolean;
  v_day smallint;
  v_time time;
  v_schedule record;
  v_previous_schedule record;
begin
  select is_open into v_open
  from public.restaurants
  where id = p_restaurant_id and is_active;
  if coalesce(v_open, false) = false then return false; end if;

  v_day := extract(dow from (now() at time zone 'Asia/Baghdad'))::smallint;
  v_time := (now() at time zone 'Asia/Baghdad')::time;
  select * into v_previous_schedule
  from public.restaurant_operating_hours
  where restaurant_id = p_restaurant_id and day_of_week = (v_day + 6) % 7;
  if found and v_previous_schedule.is_open
    and v_previous_schedule.closes_at <= v_previous_schedule.opens_at
    and v_time < v_previous_schedule.closes_at then
    return true;
  end if;

  select * into v_schedule
  from public.restaurant_operating_hours
  where restaurant_id = p_restaurant_id and day_of_week = v_day;
  if not found then return true; end if;
  if not v_schedule.is_open then return false; end if;
  if v_schedule.closes_at > v_schedule.opens_at then
    return v_time >= v_schedule.opens_at and v_time < v_schedule.closes_at;
  end if;
  return v_time >= v_schedule.opens_at;
end;
$$;

create policy "public read restaurant operating hours"
  on public.restaurant_operating_hours for select
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.is_active
    )
  );
