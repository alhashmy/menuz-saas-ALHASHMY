import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Flame, Loader2, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMenuItems, useToggleItemBestseller } from '@/features/menu/api'
import type { Order } from '@/features/orders/types'

function baghdadKey(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const get = (name: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === name)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function AnalyticsPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?.id ?? null)
  const { data: menuItems = [] } = useMenuItems()
  const bestseller = useToggleItemBestseller()
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['analytics-orders', restaurantId],
    enabled: Boolean(restaurantId),
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase.from('orders').select('*').eq('restaurant_id', restaurantId!).order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Order[]
    },
  })
  const report = useMemo(() => {
    const completed = orders.filter((order) => order.status === 'completed')
    const cancelled = orders.filter((order) => order.status === 'cancelled')
    const revenue = completed.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
    const itemTotals = new Map<string, { name: string; quantity: number }>()
    for (const order of completed) for (const item of order.items ?? []) {
      const key = item.menu_item_id ?? item.name
      const record = itemTotals.get(key) ?? { name: item.name, quantity: 0 }
      record.quantity += Number(item.quantity || 0)
      itemTotals.set(key, record)
    }
    const topItems = [...itemTotals.entries()].map(([id, item]) => ({ id, ...item, menuItem: menuItems.find((menuItem) => menuItem.id === id) })).sort((a, b) => b.quantity - a.quantity).slice(0, 8)
    const days: { key: string; label: string; sales: number }[] = []
    const today = new Date()
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(today.getTime() - index * 86_400_000)
      const key = baghdadKey(date.toISOString())
      days.push({ key, label: new Intl.DateTimeFormat('ar-IQ', { timeZone: 'Asia/Baghdad', weekday: 'short' }).format(date), sales: 0 })
    }
    for (const order of completed) {
      const day = days.find((entry) => entry.key === baghdadKey(order.created_at))
      if (day) day.sales += Number(order.total_amount || 0)
    }
    return { completed, cancelled, revenue, topItems, days }
  }, [menuItems, orders])

  return <><Header><div className='ms-auto' /><ThemeSwitch /><ProfileDropdown /></Header><Main dir='rtl'>
    <div className='mb-6'><h1 className='flex items-center gap-2 text-2xl font-bold'><TrendingUp className='size-6 text-primary' /> التحليلات</h1><p className='mt-1 text-sm text-muted-foreground'>قراءة فعلية للمبيعات والطلبات المسجلة في المطعم.</p></div>
    {isLoading ? <div className='flex h-64 items-center justify-center text-muted-foreground'><Loader2 className='me-2 size-5 animate-spin' /> جارٍ تحميل التحليلات…</div> : <div className='space-y-5'>
      <section className='grid gap-4 sm:grid-cols-3'><Metric title='إجمالي المبيعات' value={`${report.revenue.toLocaleString('ar-IQ')} د.ع`} /><Metric title='الطلبات المكتملة' value={report.completed.length.toLocaleString('ar-IQ')} /><Metric title='الطلبات الملغية' value={report.cancelled.length.toLocaleString('ar-IQ')} /></section>
      <div className='grid gap-5 lg:grid-cols-2'><Card><CardHeader><CardTitle>مبيعات آخر 7 أيام</CardTitle></CardHeader><CardContent className='h-72'><ResponsiveContainer width='100%' height='100%'><BarChart data={report.days}><XAxis dataKey='label' /><YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} /><Tooltip formatter={(value) => `${Number(value).toLocaleString('ar-IQ')} د.ع`} /><Bar dataKey='sales' fill='hsl(var(--primary))' radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle>الأطباق الأكثر مبيعاً</CardTitle></CardHeader><CardContent><div className='space-y-3'>{report.topItems.length ? report.topItems.map((item) => <div key={item.id} className='flex items-center justify-between gap-3 rounded-lg border p-3'><div><p className='font-medium'>{item.name}</p><p className='text-xs text-muted-foreground'>{item.quantity} قطعة مكتملة</p></div>{item.menuItem && <Button size='sm' variant={item.menuItem.is_bestseller ? 'secondary' : 'outline'} disabled={bestseller.isPending} onClick={() => bestseller.mutate({ id: item.menuItem!.id, is_bestseller: !item.menuItem!.is_bestseller })}><Flame className='size-4' /> {item.menuItem.is_bestseller ? 'الأعلى مبيعاً' : 'تمييز'}</Button>}</div>) : <p className='py-10 text-center text-sm text-muted-foreground'>لا توجد مبيعات مكتملة بعد.</p>}</div></CardContent></Card></div>
    </div>}
  </Main></>
}

function Metric({ title, value }: { title: string; value: string }) { return <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>{title}</CardTitle></CardHeader><CardContent><p className='text-2xl font-bold'>{value}</p></CardContent></Card> }
