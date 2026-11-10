-- ============================================================
-- 0003: حقول هوية المطعم في جدول restaurants
-- يضيف الوصف، حالة الفتح، وروابط خرائط جوجل/Waze من صانع القوائم
-- ============================================================

alter table public.restaurants
  add column if not exists description text,
  add column if not exists is_open boolean not null default true,
  add column if not exists google_maps_url text,
  add column if not exists waze_url text;

create index if not exists idx_restaurants_is_open on public.restaurants (is_open);

-- يتم تحديث هذه الأعمدة عبر سياسة المالك/المدير القائمة (owner/manager can update restaurant)
