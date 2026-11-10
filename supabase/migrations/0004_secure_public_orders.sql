-- ============================================================
-- 0004: طلبات المنيو العامة الآمنة
-- لا تثق هذه الدالة بأي سعر أو إجمالي آتٍ من المتصفح.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'
    );
  end if;
end
$$;

-- حقول يعتمد عليها منشئ المنيو وإعدادات طلبات الزبائن.
alter table public.restaurants
  add column if not exists ordering_mode text not null default 'system',
  add column if not exists whatsapp_number text;

alter table public.restaurant_branding
  add column if not exists style jsonb not null default jsonb_build_object(
    'layoutTemplate', 'grid-cards',
    'themeMode', 'light',
    'accentColor', '#ed6a3a',
    'isOpen', true,
    'bannerUrls', jsonb_build_array()
  );

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants(id) on delete cascade,
  customer_name    text not null,
  customer_phone   text not null,
  customer_address text,
  items            jsonb not null default '[]'::jsonb,
  discount_code    text,
  discount_amount  numeric(10,2) not null default 0 check (discount_amount >= 0),
  total_amount     numeric(10,2) not null check (total_amount >= 0),
  status           public.order_status not null default 'pending',
  created_at       timestamptz not null default now()
);

create index if not exists idx_orders_restaurant_created_at
  on public.orders (restaurant_id, created_at desc);
create index if not exists idx_orders_restaurant_phone_created_at
  on public.orders (restaurant_id, customer_phone, created_at desc);

alter table public.orders enable row level security;

drop policy if exists "staff can view own restaurant orders" on public.orders;
create policy "staff can view own restaurant orders"
  on public.orders for select
  using (public.is_restaurant_staff(restaurant_id));

drop policy if exists "staff can update own restaurant orders" on public.orders;
create policy "staff can update own restaurant orders"
  on public.orders for update
  using (public.is_restaurant_staff(restaurant_id))
  with check (public.is_restaurant_staff(restaurant_id));

drop policy if exists "staff can create own restaurant orders" on public.orders;
create policy "staff can create own restaurant orders"
  on public.orders for insert
  with check (public.is_restaurant_staff(restaurant_id));

-- تضييق قراءة البيانات العامة إلى ما يخص مطاعم فعّالة فقط.
drop policy if exists "public can read active categories" on public.menu_categories;
create policy "public can read active categories"
  on public.menu_categories for select
  using (
    is_active
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.is_active
    )
  );

drop policy if exists "public can read available items" on public.menu_items;
create policy "public can read available items"
  on public.menu_items for select
  using (
    is_available
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.is_active
    )
  );

drop policy if exists "public can read active offers" on public.offers;
create policy "public can read active offers"
  on public.offers for select
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    and exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.is_active
    )
  );

drop policy if exists "public can read branding" on public.restaurant_branding;
create policy "public can read branding"
  on public.restaurant_branding for select
  using (
    public.is_restaurant_staff(restaurant_id)
    or exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.is_active
    )
  );

drop policy if exists "public can read option groups" on public.menu_item_option_groups;
create policy "public can read option groups"
  on public.menu_item_option_groups for select
  using (
    exists (
      select 1
      from public.menu_items i
      join public.restaurants r on r.id = i.restaurant_id
      where i.id = item_id and i.is_available and r.is_active
    )
  );

drop policy if exists "public can read options" on public.menu_item_options;
create policy "public can read options"
  on public.menu_item_options for select
  using (
    exists (
      select 1
      from public.menu_item_option_groups g
      join public.menu_items i on i.id = g.item_id
      join public.restaurants r on r.id = i.restaurant_id
      where g.id = group_id and i.is_available and r.is_active
    )
  );

create or replace function public.create_public_order(
  p_restaurant_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_items jsonb,
  p_promo_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant record;
  v_item jsonb;
  v_menu_item record;
  v_item_offer record;
  v_order_offer record;
  v_item_id uuid;
  v_quantity integer;
  v_notes text;
  v_unit_price numeric(10,2);
  v_line_total numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_total numeric(10,2);
  v_total_quantity integer := 0;
  v_order_id uuid;
  v_result_items jsonb := '[]'::jsonb;
  v_clean_name text := btrim(coalesce(p_customer_name, ''));
  v_clean_phone text := btrim(coalesce(p_customer_phone, ''));
  v_clean_address text := nullif(btrim(coalesce(p_customer_address, '')), '');
  v_clean_promo text := nullif(lower(btrim(coalesce(p_promo_code, ''))), '');
begin
  if char_length(v_clean_name) < 2 or char_length(v_clean_name) > 80 then
    raise exception 'يرجى إدخال اسم صحيح.' using errcode = '22023';
  end if;

  if v_clean_phone !~ '^[+0-9 ()-]{7,25}$' then
    raise exception 'يرجى إدخال رقم هاتف صحيح.' using errcode = '22023';
  end if;

  if v_clean_address is not null and char_length(v_clean_address) > 240 then
    raise exception 'العنوان طويل جدًا.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'سلة الطلب غير صالحة.' using errcode = '22023';
  end if;

  select id, is_active, is_open
  into v_restaurant
  from public.restaurants
  where id = p_restaurant_id;

  if not found or not v_restaurant.is_active then
    raise exception 'هذا المطعم غير متاح للطلبات.' using errcode = '22023';
  end if;

  if not v_restaurant.is_open then
    raise exception 'المطعم مغلق حاليًا.' using errcode = '22023';
  end if;

  -- حدّ خفيف للتكرار يحدّ من الطلبات الآلية من الرقم نفسه، مع بقاء الحماية الأساسية على الخادم.
  if exists (
    select 1 from public.orders
    where restaurant_id = p_restaurant_id
      and customer_phone = v_clean_phone
      and created_at > now() - interval '30 seconds'
  ) then
    raise exception 'يرجى الانتظار قليلًا قبل إرسال طلب آخر.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_item_id := (v_item ->> 'item_id')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'أحد أصناف الطلب غير صالح.' using errcode = '22023';
    end;

    if v_quantity is null or v_quantity < 1 or v_quantity > 20 then
      raise exception 'كمية الصنف يجب أن تكون بين 1 و20.' using errcode = '22023';
    end if;

    v_total_quantity := v_total_quantity + v_quantity;
    if v_total_quantity > 100 then
      raise exception 'تجاوزت الحد الأقصى للطلب.' using errcode = '22023';
    end if;

    v_notes := nullif(left(regexp_replace(coalesce(v_item ->> 'notes', ''), '\s+', ' ', 'g'), 240), '');

    select i.id, coalesce(i.name_ar, i.name) as name, i.price
    into v_menu_item
    from public.menu_items i
    join public.menu_categories c on c.id = i.category_id
    where i.id = v_item_id
      and i.restaurant_id = p_restaurant_id
      and i.is_available
      and c.is_active;

    if not found then
      raise exception 'أحد الأصناف لم يعد متوفرًا.' using errcode = '22023';
    end if;

    select o.discount_kind, o.discount_value
    into v_item_offer
    from public.offers o
    where o.restaurant_id = p_restaurant_id
      and o.scope = 'item'
      and o.item_id = v_item_id
      and o.is_active
      and (o.starts_at is null or o.starts_at <= now())
    and (o.expires_at is null or o.expires_at >= now())
    order by o.discount_value desc
    limit 1;

    v_unit_price := v_menu_item.price;
    if found then
      if v_item_offer.discount_kind = 'percentage' then
        v_unit_price := v_unit_price - (v_unit_price * v_item_offer.discount_value / 100);
      else
        v_unit_price := v_unit_price - v_item_offer.discount_value;
      end if;
    end if;
    v_unit_price := greatest(0, round(v_unit_price, 2));
    v_line_total := round(v_unit_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_result_items := v_result_items || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'menu_item_id', v_menu_item.id,
      'name', v_menu_item.name,
      'price', v_unit_price,
      'quantity', v_quantity,
      'total', v_line_total,
      'notes', v_notes
    )));
  end loop;

  if v_clean_promo is not null then
    select o.discount_kind, o.discount_value, o.promo_code
    into v_order_offer
    from public.offers o
    where o.restaurant_id = p_restaurant_id
      and o.scope = 'order'
      and lower(o.promo_code) = v_clean_promo
      and o.is_active
      and (o.starts_at is null or o.starts_at <= now())
      and (o.expires_at is null or o.expires_at >= now())
    limit 1;

    if not found then
      raise exception 'رمز الخصم غير صالح أو منتهٍ.' using errcode = '22023';
    end if;

    if v_order_offer.discount_kind = 'percentage' then
      v_discount := round(v_subtotal * v_order_offer.discount_value / 100, 2);
    else
      v_discount := least(v_subtotal, v_order_offer.discount_value);
    end if;
  end if;

  v_total := greatest(0, round(v_subtotal - v_discount, 2));

  insert into public.orders (
    restaurant_id, customer_name, customer_phone, customer_address,
    items, discount_code, discount_amount, total_amount, status
  ) values (
    p_restaurant_id, v_clean_name, v_clean_phone, v_clean_address,
    v_result_items, v_clean_promo, v_discount, v_total, 'pending'
  ) returning id into v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'items', v_result_items,
    'discount_amount', v_discount,
    'total_amount', v_total
  );
end;
$$;

revoke all on function public.create_public_order(uuid, text, text, text, jsonb, text) from public;
grant execute on function public.create_public_order(uuid, text, text, text, jsonb, text) to anon, authenticated;
