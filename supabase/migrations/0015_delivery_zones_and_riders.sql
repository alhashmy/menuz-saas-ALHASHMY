-- 1. تفعيل PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. جدول مناطق التوصيل على مستوى المنصة (باسم platform_delivery_zones لتجنب التعارض مع جدول 0005)
CREATE TABLE IF NOT EXISTS public.platform_delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_name text NOT NULL,
  zone_name text NOT NULL,
  boundary geometry(Polygon, 4326) NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 2000,
  min_order_amount numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_delivery_zones_boundary
  ON public.platform_delivery_zones USING GIST (boundary);

-- 3. دالة جلب المنطقة والسعر حسب الإحداثيات
CREATE OR REPLACE FUNCTION public.get_delivery_zone_by_coords(
  p_lat double precision,
  p_lng double precision
)
RETURNS TABLE (
  zone_id uuid,
  district_name text,
  zone_name text,
  delivery_fee numeric,
  min_order_amount numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT id, district_name, zone_name, delivery_fee, min_order_amount
  FROM public.platform_delivery_zones
  WHERE is_active = true
    AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
  LIMIT 1;
$$;

-- 4. جدول الكباتن
CREATE TABLE IF NOT EXISTS public.riders (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text UNIQUE NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'motorcycle',
  is_online boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  current_location geography(Point, 4326),
  last_location_at timestamptz,
  cod_balance numeric NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_riders_current_location
  ON public.riders USING GIST (current_location);

-- 5. دالة البحث عن أقرب الكباتن المتاحين
CREATE OR REPLACE FUNCTION public.find_nearest_available_riders(
  p_lat double precision,
  p_lng double precision,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  rider_id uuid,
  full_name text,
  phone text,
  vehicle_type text,
  distance_meters double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    full_name,
    phone,
    vehicle_type,
    ST_Distance(
      current_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_meters
  FROM public.riders
  WHERE is_online = true
    AND is_available = true
    AND is_verified = true
    AND current_location IS NOT NULL
  ORDER BY current_location <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  LIMIT p_limit;
$$;

-- 6. تحديث جدول الطلبات لدعم التوصيل
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'dine_in',
  ADD COLUMN IF NOT EXISTS platform_zone_id uuid REFERENCES public.platform_delivery_zones(id),
  ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES public.riders(id),
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_lat double precision,
  ADD COLUMN IF NOT EXISTS customer_lng double precision,
  ADD COLUMN IF NOT EXISTS nearest_landmark text,
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending';

-- 7. جدول دفتر العهدة النقدية للكباتن
CREATE TABLE IF NOT EXISTS public.rider_cod_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  transaction_type text NOT NULL,
  amount numeric NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. تفعيل RLS والـ Realtime
ALTER TABLE public.platform_delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_cod_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active platform zones"
  ON public.platform_delivery_zones FOR SELECT
  USING (is_active = true);

CREATE POLICY "Riders read and update own profile"
  ON public.riders FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Riders read own cod ledger"
  ON public.rider_cod_ledger FOR SELECT
  USING (auth.uid() = rider_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
