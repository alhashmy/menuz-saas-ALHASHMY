-- ============================================================
-- Super Admin Migration (Idempotent)
-- Adds hierarchical admin system (Root Owner + Sub-Admins)
-- Adds platform notifications for admin-restaurant communication
-- Safe to run multiple times
-- ============================================================

-- ============================================================
-- 1. ENHANCE RESTAURANTS TABLE
-- ============================================================
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS owner_email TEXT DEFAULT NULL;

-- ============================================================
-- 2. PLATFORM ADMINS TABLE (Sub-Admins)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT,
  role            TEXT NOT NULL DEFAULT 'sub_admin', -- 'root_owner' or 'sub_admin'
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON public.platform_admins (user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON public.platform_admins (email);

-- Trigger for updated_at (create function if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER trg_platform_admins_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Root Owner can manage all platform_admins
DROP POLICY IF EXISTS "root_owner can manage platform_admins" ON public.platform_admins;
CREATE POLICY "root_owner can manage platform_admins"
  ON public.platform_admins FOR ALL
  USING (public.is_root_owner())
  WITH CHECK (public.is_root_owner());

-- Sub-Admins can read active platform_admins (for listing)
DROP POLICY IF EXISTS "sub_admin can read platform_admins" ON public.platform_admins;
CREATE POLICY "sub_admin can read platform_admins"
  ON public.platform_admins FOR SELECT
  USING (public.is_platform_admin() AND is_active = true);

-- Admins can read their own record
DROP POLICY IF EXISTS "admin can read own record" ON public.platform_admins;
CREATE POLICY "admin can read own record"
  ON public.platform_admins FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 3. PLATFORM NOTIFICATIONS TABLE (Admin -> Restaurant communication)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  admin_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'info', -- 'subscription_warning', 'urgent', 'info', 'chat'
  contact_url     TEXT, -- optional direct contact link (WhatsApp, etc.)
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_notifications_restaurant ON public.platform_notifications (restaurant_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_notifications_admin ON public.platform_notifications (admin_id);

-- RLS
ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;

-- Root Owner and Sub-Admins can insert notifications
DROP POLICY IF EXISTS "platform_admin can insert notifications" ON public.platform_notifications;
CREATE POLICY "platform_admin can insert notifications"
  ON public.platform_notifications FOR INSERT
  WITH CHECK (public.is_platform_admin());

-- Root Owner and Sub-Admins can read all notifications
DROP POLICY IF EXISTS "platform_admin can read all notifications" ON public.platform_notifications;
CREATE POLICY "platform_admin can read all notifications"
  ON public.platform_notifications FOR SELECT
  USING (public.is_platform_admin());

-- Root Owner and Sub-Admins can update (mark read/unread) all notifications
DROP POLICY IF EXISTS "platform_admin can update notifications" ON public.platform_notifications;
CREATE POLICY "platform_admin can update notifications"
  ON public.platform_notifications FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Restaurant staff can read their restaurant's notifications
DROP POLICY IF EXISTS "restaurant staff can read own notifications" ON public.platform_notifications;
CREATE POLICY "restaurant staff can read own notifications"
  ON public.platform_notifications FOR SELECT
  USING (public.is_restaurant_staff(restaurant_id));

-- Restaurant staff can update their own notifications (mark as read)
DROP POLICY IF EXISTS "restaurant staff can update own notifications" ON public.platform_notifications;
CREATE POLICY "restaurant staff can update own notifications"
  ON public.platform_notifications FOR UPDATE
  USING (public.is_restaurant_staff(restaurant_id) AND admin_id IS NOT NULL)
  WITH CHECK (public.is_restaurant_staff(restaurant_id) AND is_read = true);

-- ============================================================
-- 4. HELPER FUNCTIONS FOR ADMIN ROLE CHECKS
-- ============================================================

-- Root Owner: Only the specific email 'alhashmy@manger.iq'
CREATE OR REPLACE FUNCTION public.is_root_owner()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT auth.jwt() ->> 'email' = 'alhashmy@manger.iq';
$$;

-- Platform Admin: Root Owner OR active record in platform_admins
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_root_owner()
     OR EXISTS (
       SELECT 1 FROM public.platform_admins pa
       WHERE pa.user_id = auth.uid()
         AND pa.is_active = true
     );
$$;

-- Super Admin (legacy compatibility): Root Owner OR Platform Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_platform_admin();
$$;

-- Can delete restaurants: Only Root Owner
CREATE OR REPLACE FUNCTION public.can_delete_restaurants()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_root_owner();
$$;

-- Can manage platform admins: Only Root Owner
CREATE OR REPLACE FUNCTION public.can_manage_platform_admins()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_root_owner();
$$;

-- ============================================================
-- 5. UPDATE SUPER ADMIN POLICIES TO USE is_platform_admin()
-- ============================================================

-- Restaurants: Platform admins can read/insert/update, only root can delete
DROP POLICY IF EXISTS "super_admin can read all restaurants" ON public.restaurants;
CREATE POLICY "platform_admin can read all restaurants"
  ON public.restaurants FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "super_admin can insert restaurants" ON public.restaurants;
CREATE POLICY "platform_admin can insert restaurants"
  ON public.restaurants FOR INSERT
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "super_admin can update all restaurants" ON public.restaurants;
CREATE POLICY "platform_admin can update all restaurants"
  ON public.restaurants FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "super_admin can delete restaurants" ON public.restaurants;
CREATE POLICY "root_owner can delete restaurants"
  ON public.restaurants FOR DELETE
  USING (public.can_delete_restaurants());

-- Other tables: Platform admins get full access (use DO blocks for tables that may not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'restaurant_staff') THEN
    DROP POLICY IF EXISTS "super_admin can manage all staff" ON public.restaurant_staff;
    CREATE POLICY "platform_admin can manage all staff"
      ON public.restaurant_staff FOR ALL
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'menu_categories') THEN
    DROP POLICY IF EXISTS "super_admin can manage all categories" ON public.menu_categories;
    CREATE POLICY "platform_admin can manage all categories"
      ON public.menu_categories FOR ALL
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'menu_items') THEN
    DROP POLICY IF EXISTS "super_admin can manage all items" ON public.menu_items;
    CREATE POLICY "platform_admin can manage all items"
      ON public.menu_items FOR ALL
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'orders') THEN
    DROP POLICY IF EXISTS "super_admin can manage all orders" ON public.orders;
    CREATE POLICY "platform_admin can manage all orders"
      ON public.orders FOR ALL
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'restaurant_branding') THEN
    DROP POLICY IF EXISTS "super_admin can manage all branding" ON public.restaurant_branding;
    CREATE POLICY "platform_admin can manage all branding"
      ON public.restaurant_branding FOR ALL
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'offers') THEN
    DROP POLICY IF EXISTS "super_admin can manage all offers" ON public.offers;
    CREATE POLICY "platform_admin can manage all offers"
      ON public.offers FOR ALL
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'restaurant_operating_hours') THEN
    DROP POLICY IF EXISTS "super_admin can manage all operating_hours" ON public.restaurant_operating_hours;
    CREATE POLICY "platform_admin can manage all operating_hours"
      ON public.restaurant_operating_hours FOR ALL
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'delivery_zones') THEN
    DROP POLICY IF EXISTS "super_admin can manage all delivery_zones" ON public.delivery_zones;
    CREATE POLICY "platform_admin can manage all delivery_zones"
      ON public.delivery_zones FOR ALL
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'restaurant_tables') THEN
    DROP POLICY IF EXISTS "super_admin can manage all tables" ON public.restaurant_tables;
    CREATE POLICY "platform_admin can manage all tables"
      ON public.restaurant_tables FOR ALL
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'reviews') THEN
    DROP POLICY IF EXISTS "super_admin can manage all reviews" ON public.reviews;
    CREATE POLICY "platform_admin can manage all reviews"
      ON public.reviews FOR ALL
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin());
  END IF;
END $$;

-- Storage
DROP POLICY IF EXISTS "super_admin can manage all storage" ON storage.objects;
CREATE POLICY "platform_admin can manage all storage"
  ON storage.objects FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ============================================================
-- 6. STATS VIEWS (Drop and recreate for idempotency)
-- ============================================================
DROP VIEW IF EXISTS public.super_admin_stats CASCADE;
CREATE VIEW public.super_admin_stats AS
SELECT
  COUNT(*) AS total_restaurants,
  COUNT(*) FILTER (WHERE is_active = true) AS active_restaurants,
  COUNT(*) FILTER (WHERE is_active = false) AS inactive_restaurants,
  COUNT(*) FILTER (WHERE subscription_ends_at IS NOT NULL AND subscription_ends_at < NOW()) AS expired_subscriptions,
  COUNT(*) FILTER (WHERE subscription_ends_at IS NOT NULL AND subscription_ends_at BETWEEN NOW() AND NOW() + INTERVAL '7 days') AS expiring_soon
FROM public.restaurants;

GRANT SELECT ON public.super_admin_stats TO authenticated;

DROP VIEW IF EXISTS public.platform_admin_stats CASCADE;
CREATE VIEW public.platform_admin_stats AS
SELECT
  COUNT(*) FILTER (WHERE role = 'root_owner') AS root_owners,
  COUNT(*) FILTER (WHERE role = 'sub_admin' AND is_active = true) AS active_sub_admins,
  COUNT(*) FILTER (WHERE role = 'sub_admin' AND is_active = false) AS inactive_sub_admins
FROM public.platform_admins;

GRANT SELECT ON public.platform_admin_stats TO authenticated;

DROP VIEW IF EXISTS public.platform_notification_stats CASCADE;
CREATE VIEW public.platform_notification_stats AS
SELECT
  COUNT(*) AS total_notifications,
  COUNT(*) FILTER (WHERE is_read = false) AS unread_notifications,
  COUNT(*) FILTER (WHERE type = 'urgent') AS urgent_notifications,
  COUNT(*) FILTER (WHERE type = 'subscription_warning') AS subscription_warnings
FROM public.platform_notifications;

GRANT SELECT ON public.platform_notification_stats TO authenticated;

-- ============================================================
-- 7. PUBLIC READ POLICY (Updated with subscription check)
-- ============================================================
DROP POLICY IF EXISTS "public can read active restaurants" ON public.restaurants;
CREATE POLICY "public can read active restaurants"
  ON public.restaurants FOR SELECT
  USING (
    is_active = true
    AND (subscription_ends_at IS NULL OR subscription_ends_at > NOW())
  );

-- ============================================================
-- 8. SEED ROOT OWNER (Run once after deployment)
-- ============================================================
-- The root owner should be created by:
-- 1. Signing up the user via auth (email: alhashmy@manger.iq)
-- 2. Running this insert with the actual user_id:
-- INSERT INTO public.platform_admins (user_id, email, full_name, role, is_active)
-- VALUES ('<actual-user-id-from-auth>', 'alhashmy@manger.iq', 'المالك الأعلى', 'root_owner', true)
-- ON CONFLICT (user_id) DO UPDATE SET role = 'root_owner', is_active = true;

-- ============================================================
-- NOTES:
-- - The root owner email is hardcoded as 'alhashmy@manger.iq' in is_root_owner()
-- - Configure VITE_SUPER_ADMIN_EMAIL in Vercel env as 'alhashmy@manger.iq'
-- - Run this migration after deploying the schema
-- ============================================================