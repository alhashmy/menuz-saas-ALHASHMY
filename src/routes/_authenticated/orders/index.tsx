import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Archive,
  BellRing,
  Eye,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  useArchiveTodayOrders,
  useDeleteOrder,
  useOrders,
} from '@/features/orders/api'
import { OrderDetailsSheet } from '@/features/orders/components/OrderDetailsSheet'
import type { Order, OrderStatus } from '@/features/orders/types'

const statusMeta: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'قيد الانتظار', className: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'مؤكد', className: 'bg-sky-100 text-sky-800' },
  preparing: {
    label: 'قيد التحضير',
    className: 'bg-violet-100 text-violet-800',
  },
  ready: { label: 'جاهز', className: 'bg-emerald-100 text-emerald-800' },
  completed: { label: 'مكتمل', className: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'ملغي', className: 'bg-rose-100 text-rose-800' },
}

const filters: Array<{ value: 'all' | OrderStatus; label: string }> = [
  { value: 'all', label: 'كل الطلبات' },
  { value: 'pending', label: 'جديدة' },
  { value: 'preparing', label: 'قيد التحضير' },
  { value: 'ready', label: 'جاهزة' },
  { value: 'completed', label: 'مكتملة' },
]

function playNotificationChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(
      1320,
      context.currentTime + 0.14
    )
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.52)
    oscillator.addEventListener('ended', () => void context.close())
  } catch {
    // Browsers may require a prior user gesture before permitting audio.
  }
}

function OrderCard({
  order,
  onView,
  onDelete,
}: {
  order: Order
  onView: () => void
  onDelete: () => void
}) {
  const meta = statusMeta[order.status]
  const itemCount = (order.items ?? []).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  )

  return (
    <article className='group rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-xs font-semibold text-muted-foreground'>
            طلب #{order.daily_sequence}
          </p>
          <h2 className='mt-1 truncate font-bold'>{order.customer_name}</h2>
          <p className='mt-1 text-xs text-muted-foreground' dir='ltr'>
            {order.customer_phone}
          </p>
        </div>
        <Badge className={meta.className}>{meta.label}</Badge>
      </div>
      <div className='mt-4 flex items-center justify-between border-y py-3 text-sm'>
        <span className='text-muted-foreground'>{itemCount} قطعة</span>
        <strong>
          {Number(order.total_amount).toLocaleString('ar-IQ')} د.ع
        </strong>
      </div>
      <div className='mt-3 flex items-center justify-between gap-2'>
        <time className='text-xs text-muted-foreground'>
          {new Date(order.created_at).toLocaleTimeString('ar-IQ', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
        <div className='flex gap-1'>
          <Button
            variant='ghost'
            size='icon'
            onClick={onView}
            aria-label='عرض الطلب'
          >
            <Eye className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='text-muted-foreground hover:text-destructive'
            onClick={onDelete}
            aria-label='حذف الطلب'
          >
            <Trash2 className='size-4' />
          </Button>
        </div>
      </div>
    </article>
  )
}

export function OrdersPage() {
  const { restaurant } = useAuthStore()
  const restaurantId = restaurant?.id ?? null
  const queryClient = useQueryClient()
  const { data: orders = [], isLoading } = useOrders(restaurantId)
  const archiveToday = useArchiveTodayOrders()
  const deleteOrder = useDeleteOrder()
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)

  useEffect(() => {
    if (!restaurantId) return
    const channel = supabase
      .channel('custom-insert-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          playNotificationChime()
          toast.success('وصل طلب جديد الآن.')
          void queryClient.invalidateQueries({
            queryKey: ['orders', restaurantId],
          })
          void queryClient.invalidateQueries({
            queryKey: ['order-stats', restaurantId],
          })
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, restaurantId])

  const visibleOrders = useMemo(
    () =>
      filter === 'all'
        ? orders
        : orders.filter((order) => order.status === filter),
    [filter, orders]
  )

  async function handleArchiveToday() {
    try {
      await archiveToday.mutateAsync()
      toast.success('تمت أرشفة طلبات اليوم.')
      setArchiveConfirmOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذرت أرشفة الطلبات.'
      )
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteOrder.mutateAsync(deleteTarget.id)
      toast.success('تم حذف الطلب.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف الطلب.')
    }
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] })
    void queryClient.invalidateQueries({
      queryKey: ['order-stats', restaurantId],
    })
  }

  return (
    <div className='space-y-6' dir='rtl'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2'>
            <BellRing className='size-5 text-primary' />
            <h1 className='text-2xl font-bold tracking-tight'>مركز الطلبات</h1>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>
            تظهر الطلبات الجديدة فور وصولها، والأرشيف مخفي من هذه الواجهة.
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={refresh}>
            <RefreshCw className='size-4' /> تحديث
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setArchiveConfirmOpen(true)}
            disabled={!orders.length}
          >
            <Archive className='size-4' /> أرشفة طلبات اليوم
          </Button>
        </div>
      </header>
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as 'all' | OrderStatus)}
      >
        <TabsList className='h-auto flex-wrap justify-start gap-1 bg-transparent p-0'>
          {filters.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className='rounded-full border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {isLoading ? (
        <div className='flex h-52 items-center justify-center text-muted-foreground'>
          <Loader2 className='me-2 size-5 animate-spin' /> جارٍ جلب الطلبات...
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className='rounded-2xl border border-dashed p-12 text-center text-muted-foreground'>
          لا توجد طلبات غير مؤرشفة في هذا القسم.
        </div>
      ) : (
        <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onView={() => setDetailsOrder(order)}
              onDelete={() => setDeleteTarget(order)}
            />
          ))}
        </section>
      )}
      {detailsOrder && (
        <OrderDetailsSheet
          open
          onOpenChange={(open) => !open && setDetailsOrder(null)}
          order={detailsOrder}
          restaurantName={restaurant?.name}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='حذف الطلب نهائيًا؟'
        desc='سيُحذف هذا الطلب من السجل بشكل نهائي، ولا يمكن استعادته.'
        confirmText='حذف نهائي'
        cancelBtnText='إلغاء'
        destructive
        isLoading={deleteOrder.isPending}
        handleConfirm={handleDelete}
      />
      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title='أرشفة طلبات اليوم؟'
        desc='ستختفي كل طلبات اليوم من لوحة الطلبات النشطة، وستبقى محفوظة في قاعدة البيانات.'
        confirmText='أرشفة الطلبات'
        cancelBtnText='إلغاء'
        isLoading={archiveToday.isPending}
        handleConfirm={handleArchiveToday}
      />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/orders/')({
  component: OrdersPage,
})
