-- ============================================================
-- Support Channel Migration (Idempotent)
-- Adds sender tracking columns to platform_notifications for
-- bidirectional communication between restaurants and platform admin
-- Safe to run multiple times
-- ============================================================

-- ============================================================
-- 1. ADD SENDER TRACKING COLUMNS TO PLATFORM_NOTIFICATIONS
-- ============================================================
ALTER TABLE public.platform_notifications
  ADD COLUMN IF NOT EXISTS sender_role TEXT CHECK (sender_role IN ('admin', 'restaurant')),
  ADD COLUMN IF NOT EXISTS sender_id UUID,
  ADD COLUMN IF NOT EXISTS sender_email TEXT;

-- Add index for filtering by sender_role
CREATE INDEX IF NOT EXISTS idx_platform_notifications_sender_role
  ON public.platform_notifications (sender_role, created_at DESC);

-- Add index for restaurant conversations (for /support page)
CREATE INDEX IF NOT EXISTS idx_platform_notifications_restaurant_conversation
  ON public.platform_notifications (restaurant_id, sender_role, created_at DESC);

-- ============================================================
-- 2. BACKFILL EXISTING RECORDS
-- ============================================================
-- For existing records: if admin_id is set, it's from admin; otherwise from restaurant
UPDATE public.platform_notifications
SET
  sender_role = CASE
    WHEN admin_id IS NOT NULL THEN 'admin'
    ELSE 'restaurant'
  END,
  sender_id = COALESCE(admin_id, '00000000-0000-0000-0000-000000000000'::uuid),
  sender_email = CASE
    WHEN admin_id IS NOT NULL THEN 'الإدارة'
    ELSE 'المطعم'
  END
WHERE sender_role IS NULL;

-- Make sender_role NOT NULL after backfill
UPDATE public.platform_notifications
SET
  sender_role = COALESCE(sender_role, CASE WHEN admin_id IS NOT NULL THEN 'admin' ELSE 'restaurant' END),
  sender_id = COALESCE(sender_id, admin_id, '00000000-0000-0000-0000-000000000000'::uuid),
  sender_email = COALESCE(sender_email, 'alhashmy@manger.iq')
WHERE sender_role IS NULL OR sender_id IS NULL OR sender_email IS NULL;

ALTER TABLE public.platform_notifications
  ALTER COLUMN sender_role SET NOT NULL,
  ALTER COLUMN sender_id SET NOT NULL,
  ALTER COLUMN sender_email SET NOT NULL;

-- ============================================================
-- 3. UPDATE RLS POLICIES FOR NEW COLUMNS
-- ============================================================
-- Restaurant staff can insert their own messages (sender_role = 'restaurant')
DROP POLICY IF EXISTS "restaurant staff can insert own messages" ON public.platform_notifications;
CREATE POLICY "restaurant staff can insert own messages"
  ON public.platform_notifications FOR INSERT
  WITH CHECK (
    public.is_restaurant_staff(restaurant_id)
    AND sender_role = 'restaurant'
    AND sender_id = auth.uid()
    AND sender_email = auth.jwt() ->> 'email'
  );

-- Restaurant staff can read all messages for their restaurant (both directions)
DROP POLICY IF EXISTS "restaurant staff can read own notifications" ON public.platform_notifications;
CREATE POLICY "restaurant staff can read own notifications"
  ON public.platform_notifications FOR SELECT
  USING (public.is_restaurant_staff(restaurant_id));

-- Restaurant staff can update their own messages (mark as read)
DROP POLICY IF EXISTS "restaurant staff can update own notifications" ON public.platform_notifications;
CREATE POLICY "restaurant staff can update own notifications"
  ON public.platform_notifications FOR UPDATE
  USING (
    public.is_restaurant_staff(restaurant_id)
    AND sender_role = 'admin'
  )
  WITH CHECK (
    public.is_restaurant_staff(restaurant_id)
    AND sender_role = 'admin'
    AND is_read = true
  );

-- Platform admins can insert messages (sender_role = 'admin')
DROP POLICY IF EXISTS "platform_admin can insert notifications" ON public.platform_notifications;
CREATE POLICY "platform_admin can insert notifications"
  ON public.platform_notifications FOR INSERT
  WITH CHECK (
    public.is_platform_admin()
    AND sender_role = 'admin'
    AND sender_id = auth.uid()
    AND sender_email = auth.jwt() ->> 'email'
  );

-- Platform admins can read all messages
DROP POLICY IF EXISTS "platform_admin can read all notifications" ON public.platform_notifications;
CREATE POLICY "platform_admin can read all notifications"
  ON public.platform_notifications FOR SELECT
  USING (public.is_platform_admin());

-- Platform admins can update all messages
DROP POLICY IF EXISTS "platform_admin can update notifications" ON public.platform_notifications;
CREATE POLICY "platform_admin can update notifications"
  ON public.platform_notifications FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ============================================================
-- 4. HELPER FUNCTION: Get conversation stats for a restaurant
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_restaurant_conversation_stats(p_restaurant_id UUID)
RETURNS TABLE (
  total_messages BIGINT,
  incoming_messages BIGINT,
  outgoing_messages BIGINT,
  unread_incoming BIGINT,
  last_message_at TIMESTAMPTZ
) LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) AS total_messages,
    COUNT(*) FILTER (WHERE sender_role = 'restaurant') AS incoming_messages,
    COUNT(*) FILTER (WHERE sender_role = 'admin') AS outgoing_messages,
    COUNT(*) FILTER (WHERE sender_role = 'restaurant' AND is_read = false) AS unread_incoming,
    MAX(created_at) AS last_message_at
  FROM public.platform_notifications
  WHERE restaurant_id = p_restaurant_id;
$$;

-- ============================================================
-- 5. HELPER FUNCTION: Get platform-wide conversation stats (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_platform_conversation_stats()
RETURNS TABLE (
  total_conversations BIGINT,
  total_messages BIGINT,
  incoming_messages BIGINT,
  outgoing_messages BIGINT,
  unread_incoming BIGINT,
  restaurants_with_unread BIGINT
) LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT restaurant_id) AS total_conversations,
    COUNT(*) AS total_messages,
    COUNT(*) FILTER (WHERE sender_role = 'restaurant') AS incoming_messages,
    COUNT(*) FILTER (WHERE sender_role = 'admin') AS outgoing_messages,
    COUNT(*) FILTER (WHERE sender_role = 'restaurant' AND is_read = false) AS unread_incoming,
    COUNT(DISTINCT restaurant_id) FILTER (WHERE sender_role = 'restaurant' AND is_read = false) AS restaurants_with_unread
  FROM public.platform_notifications;
$$;

-- ============================================================
-- 6. VIEW: Conversation stats for super admin dashboard
-- ============================================================
DROP VIEW IF EXISTS public.platform_conversation_stats CASCADE;
CREATE VIEW public.platform_conversation_stats AS
SELECT
  COUNT(DISTINCT restaurant_id) AS total_conversations,
  COUNT(*) AS total_messages,
  COUNT(*) FILTER (WHERE sender_role = 'restaurant') AS incoming_messages,
  COUNT(*) FILTER (WHERE sender_role = 'admin') AS outgoing_messages,
  COUNT(*) FILTER (WHERE sender_role = 'restaurant' AND is_read = false) AS unread_incoming,
  COUNT(DISTINCT restaurant_id) FILTER (WHERE sender_role = 'restaurant' AND is_read = false) AS restaurants_with_unread
FROM public.platform_notifications;

GRANT SELECT ON public.platform_conversation_stats TO authenticated;

-- ============================================================
-- 7. VIEW: Restaurant conversation summary (for restaurant owners)
-- ============================================================
DROP VIEW IF EXISTS public.restaurant_conversation_summary CASCADE;
CREATE VIEW public.restaurant_conversation_summary AS
SELECT
  pn.restaurant_id,
  COUNT(*) AS total_messages,
  COUNT(*) FILTER (WHERE pn.sender_role = 'restaurant') AS messages_sent,
  COUNT(*) FILTER (WHERE pn.sender_role = 'admin') AS messages_received,
  COUNT(*) FILTER (WHERE pn.sender_role = 'admin' AND pn.is_read = false) AS unread_received,
  MAX(pn.created_at) AS last_activity_at
FROM public.platform_notifications pn
GROUP BY pn.restaurant_id;

GRANT SELECT ON public.restaurant_conversation_summary TO authenticated;

-- ============================================================
-- NOTES:
-- - This migration adds sender tracking to distinguish between
--   admin->restaurant and restaurant->admin messages
-- - Restaurant owners can now send messages via /support page
-- - Super admins can view all conversations in "الإشعارات والتواصل" tab
-- - 24-hour filter applies only to restaurant view (/support)
-- - Admin view shows all messages permanently
-- ============================================================