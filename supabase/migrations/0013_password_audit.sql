-- ============================================================
-- Password Audit System
-- Tables and functions for password change tracking
-- ============================================================

-- ============================================================
-- 1. PASSWORD AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.password_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_email    TEXT NOT NULL,
  entity_name     TEXT,
  new_password    TEXT NOT NULL,
  changed_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by_email TEXT NOT NULL,
  change_type     TEXT NOT NULL DEFAULT 'own_change', -- 'own_change', 'root_reset', 'initial_creation'
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_audit_target ON public.password_audit_logs (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_audit_changed_by ON public.password_audit_logs (changed_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_audit_unread ON public.password_audit_logs (is_read, created_at DESC) WHERE is_read = false;

-- RLS
ALTER TABLE public.password_audit_logs ENABLE ROW LEVEL SECURITY;

-- Root Owner can read all password audit logs
DROP POLICY IF EXISTS "root_owner can read all password_audit_logs" ON public.password_audit_logs;
CREATE POLICY "root_owner can read all password_audit_logs"
  ON public.password_audit_logs FOR SELECT
  USING (public.is_root_owner());

-- Users can read their own password audit logs
DROP POLICY IF EXISTS "user can read own password_audit_logs" ON public.password_audit_logs;
CREATE POLICY "user can read own password_audit_logs"
  ON public.password_audit_logs FOR SELECT
  USING (target_user_id = auth.uid());

-- Root Owner can insert password audit logs (via RPC functions)
DROP POLICY IF EXISTS "root_owner can insert password_audit_logs" ON public.password_audit_logs;
CREATE POLICY "root_owner can insert password_audit_logs"
  ON public.password_audit_logs FOR INSERT
  WITH CHECK (public.is_root_owner());

-- Users can insert their own password change logs (via RPC function)
DROP POLICY IF EXISTS "user can insert own password_audit_logs" ON public.password_audit_logs;
CREATE POLICY "user can insert own password_audit_logs"
  ON public.password_audit_logs FOR INSERT
  WITH CHECK (target_user_id = auth.uid() AND changed_by = auth.uid() AND change_type = 'own_change');

-- Root Owner can update (mark as read)
DROP POLICY IF EXISTS "root_owner can update password_audit_logs" ON public.password_audit_logs;
CREATE POLICY "root_owner can update password_audit_logs"
  ON public.password_audit_logs FOR UPDATE
  USING (public.is_root_owner())
  WITH CHECK (public.is_root_owner());

-- ============================================================
-- 2. FUNCTION: log_own_password_change
-- Called by restaurant owners when they change their own password
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_own_password_change(
  p_new_password TEXT,
  p_entity_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := auth.jwt() ->> 'email';
BEGIN
  INSERT INTO public.password_audit_logs (
    target_user_id,
    target_email,
    entity_name,
    new_password,
    changed_by,
    changed_by_email,
    change_type
  ) VALUES (
    v_user_id,
    v_email,
    p_entity_name,
    p_new_password,
    v_user_id,
    v_email,
    'own_change'
  );
END;
$$;

-- ============================================================
-- 3. FUNCTION: root_reset_user_password
-- Called by Root Owner to reset any user's password
-- ============================================================
CREATE OR REPLACE FUNCTION public.root_reset_user_password(
  p_target_user_id UUID,
  p_new_password TEXT,
  p_entity_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root_user_id UUID := auth.uid();
  v_root_email TEXT := auth.jwt() ->> 'email';
  v_target_email TEXT;
BEGIN
  -- Verify the caller is root owner
  IF NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Only root owner can reset passwords';
  END IF;

  -- Get target user email
  SELECT email INTO v_target_email FROM auth.users WHERE id = p_target_user_id;
  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- Update the user's password via auth.admin
  PERFORM auth.admin_update_user_by_id(p_target_user_id, jsonb_build_object('password', p_new_password));

  -- Log the password change
  INSERT INTO public.password_audit_logs (
    target_user_id,
    target_email,
    entity_name,
    new_password,
    changed_by,
    changed_by_email,
    change_type
  ) VALUES (
    p_target_user_id,
    v_target_email,
    p_entity_name,
    p_new_password,
    v_root_user_id,
    v_root_email,
    'root_reset'
  );
END;
$$;

-- ============================================================
-- 4. FUNCTION: log_initial_password
-- Called when creating a new restaurant or admin to log initial password
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_initial_password(
  p_target_user_id UUID,
  p_target_email TEXT,
  p_new_password TEXT,
  p_entity_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root_user_id UUID := auth.uid();
  v_root_email TEXT := auth.jwt() ->> 'email';
BEGIN
  -- Verify the caller is root owner
  IF NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Only root owner can log initial passwords';
  END IF;

  -- Log the initial password creation
  INSERT INTO public.password_audit_logs (
    target_user_id,
    target_email,
    entity_name,
    new_password,
    changed_by,
    changed_by_email,
    change_type
  ) VALUES (
    p_target_user_id,
    p_target_email,
    p_entity_name,
    p_new_password,
    v_root_user_id,
    v_root_email,
    'initial_creation'
  );
END;
$$;

-- ============================================================
-- 5. VIEW: password_audit_stats
-- ============================================================
DROP VIEW IF EXISTS public.password_audit_stats CASCADE;
CREATE VIEW public.password_audit_stats AS
SELECT
  COUNT(*) AS total_changes,
  COUNT(*) FILTER (WHERE is_read = false) AS unread_changes,
  COUNT(*) FILTER (WHERE change_type = 'own_change') AS own_changes,
  COUNT(*) FILTER (WHERE change_type = 'root_reset') AS root_resets,
  COUNT(*) FILTER (WHERE change_type = 'initial_creation') AS initial_creations
FROM public.password_audit_logs;

GRANT SELECT ON public.password_audit_stats TO authenticated;