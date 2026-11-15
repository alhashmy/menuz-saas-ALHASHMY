-- صلاحيات إدارة مناطق التوصيل للمشرفين
CREATE POLICY "Admins manage platform delivery zones"
  ON public.platform_delivery_zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- صلاحيات إدارة وتوثيق الكباتن للمشرفين
CREATE POLICY "Admins manage riders"
  ON public.riders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- صلاحيات إدارة دفتر العهدة النقدية للمشرفين
CREATE POLICY "Admins manage rider cod ledger"
  ON public.rider_cod_ledger FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
