import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useArchivedOrders } from '../api'
import type { Order, OrderStatus } from '../types'

const statusLabel: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار', confirmed: 'مؤكد', preparing: 'قيد التحضير',
  ready: 'جاهز', completed: 'مكتمل', cancelled: 'ملغي',
}

function dayKey(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function csvValue(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function downloadDayCsv(day: string, orders: Order[]) {
  const rows = [
    ['رقم الطلب', 'الزبون', 'الهاتف', 'عدد القطع', 'الإجمالي', 'الحالة', 'سبب الإلغاء', 'الوقت'],
    ...orders.map((order) => [
      order.daily_sequence,
      order.customer_name,
      order.customer_phone,
      order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      Number(order.total_amount),
      statusLabel[order.status],
      order.cancellation_reason ?? '',
      new Date(order.created_at).toLocaleTimeString('ar-IQ', { timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit' }),
    ]),
  ]
  const content = '\uFEFF' + rows.map((row) => row.map(csvValue).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `orders-${day}.csv`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function OrderArchive({ restaurantId }: { restaurantId: string | null }) {
  const { data: orders = [], isLoading } = useArchivedOrders(restaurantId)
  const groups = new Map<string, Order[]>()
  for (const order of orders) {
    const key = dayKey(order.created_at)
    groups.set(key, [...(groups.get(key) ?? []), order])
  }
  const days = [...groups.entries()].sort(([a], [b]) => b.localeCompare(a))

  if (isLoading) return <div className='flex h-48 items-center justify-center text-muted-foreground'><Loader2 className='me-2 size-5 animate-spin' /> جارٍ تحميل الأرشيف…</div>
  if (!days.length) return <div className='rounded-2xl border border-dashed p-10 text-center text-muted-foreground'>لا توجد طلبات مؤرشفة حتى الآن.</div>

  return <section className='space-y-3'>
    {days.map(([day, dayOrders]) => {
      const completedTotal = dayOrders.filter((order) => order.status === 'completed').reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
      const title = new Intl.DateTimeFormat('ar-IQ', { timeZone: 'Asia/Baghdad', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${day}T12:00:00+03:00`))
      return <details key={day} className='overflow-hidden rounded-2xl border bg-card shadow-sm'>
        <summary className='flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden'>
          <div><h3 className='font-bold'>{title}</h3><p className='mt-1 text-sm text-muted-foreground'>{dayOrders.length} طلبات · مبيعات المكتمل: {completedTotal.toLocaleString('ar-IQ')} د.ع</p></div>
          <Button variant='outline' size='sm' onClick={(event) => { event.preventDefault(); event.stopPropagation(); downloadDayCsv(day, dayOrders) }}><Download className='size-4' /> تصدير CSV/Excel</Button>
        </summary>
        <div className='overflow-x-auto border-t'>
          <table className='w-full min-w-[760px] text-right text-sm'>
            <thead className='bg-muted/50 text-muted-foreground'><tr>{['رقم الطلب', 'الزبون', 'الهاتف', 'عدد القطع', 'الإجمالي', 'الحالة', 'الوقت'].map((header) => <th key={header} className='px-4 py-3 font-medium'>{header}</th>)}</tr></thead>
            <tbody>{dayOrders.map((order) => <tr key={order.id} className='border-t'>
              <td className='px-4 py-3 font-semibold'>#{order.daily_sequence}</td><td className='px-4 py-3'>{order.customer_name}</td><td className='px-4 py-3' dir='ltr'>{order.customer_phone}</td>
              <td className='px-4 py-3'>{order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</td><td className='px-4 py-3'>{Number(order.total_amount).toLocaleString('ar-IQ')} د.ع</td>
              <td className='px-4 py-3'><Badge variant={order.status === 'cancelled' ? 'destructive' : 'secondary'}>{statusLabel[order.status]}{order.cancellation_reason ? `: ${order.cancellation_reason}` : ''}</Badge></td>
              <td className='px-4 py-3'>{new Date(order.created_at).toLocaleTimeString('ar-IQ', { timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit' })}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>
    })}
  </section>
}
