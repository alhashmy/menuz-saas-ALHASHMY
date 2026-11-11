-- روابط التواصل، إبراز الأصناف، ودور الكاشير.
-- جميع الإضافات idempotent لتكون آمنة على البيئات التي تلقت جزءاً من التحديثات سابقاً.

alter table public.restaurants
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists tiktok_url text;

alter table public.menu_items
  add column if not exists is_bestseller boolean not null default false;

create index if not exists idx_menu_items_bestseller
  on public.menu_items (restaurant_id, is_bestseller desc, sort_order);

alter type public.staff_role add value if not exists 'cashier';

-- يضمن وصول INSERT إلى مستمع الإشعارات العام. بدون هذا السطر ينجح إنشاء الطلب
-- ولكن لن تستلم الواجهة حدث Realtime وبالتالي لن يعمل الصوت.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
