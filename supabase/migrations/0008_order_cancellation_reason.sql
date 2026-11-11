-- Cancellation reasons are part of the order audit trail.
alter table public.orders
  add column if not exists cancellation_reason text;

update public.orders
set cancellation_reason = 'غير محدد'
where status = 'cancelled'
  and nullif(btrim(cancellation_reason), '') is null;

alter table public.orders
  add constraint orders_cancelled_requires_reason
  check (
    status <> 'cancelled'
    or char_length(btrim(coalesce(cancellation_reason, ''))) between 2 and 240
  );

notify pgrst, 'reload schema';
