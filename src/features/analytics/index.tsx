import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Flame, Loader2, Star, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
      <ManualReviewForm restaurantId={restaurantId} items={menuItems} />
    </div>}
  </Main></>
}

function Metric({ title, value }: { title: string; value: string }) { return <Card><CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>{title}</CardTitle></CardHeader><CardContent><p className='text-2xl font-bold'>{value}</p></CardContent></Card> }

function ManualReviewForm({ restaurantId, items }: { restaurantId: string | null; items: { id: string; name: string; name_ar: string | null }[] }) {
  const [itemId, setItemId] = useState('')
  const [stars, setStars] = useState(5)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!restaurantId || !itemId || !text.trim()) { toast.error('اختر وجبة واكتب نص التقييم.'); return }
    setSaving(true)
    const { error } = await supabase.from('menu_item_reviews').insert({ restaurant_id: restaurantId, item_id: itemId, stars, review_text: text.trim() })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setText(''); setStars(5); toast.success('تم نشر التقييم في تفاصيل الوجبة.')
  }
  return <Card><CardHeader><CardTitle>إضافة تقييم يدوي لوجبة</CardTitle></CardHeader><CardContent><form className='grid gap-4 md:grid-cols-3' onSubmit={submit}><div className='space-y-2'><Label>الوجبة</Label><Select value={itemId} onValueChange={setItemId}><SelectTrigger className='w-full'><SelectValue placeholder='اختر وجبة' /></SelectTrigger><SelectContent>{items.map((item) => <SelectItem key={item.id} value={item.id}>{item.name_ar ?? item.name}</SelectItem>)}</SelectContent></Select></div><div className='space-y-2'><Label>عدد النجوم</Label><div className='flex h-9 items-center gap-1'>{[1,2,3,4,5].map((star) => <button key={star} type='button' onClick={() => setStars(star)} className={star <= stars ? 'text-amber-500' : 'text-muted-foreground'} aria-label={`${star} نجوم`}><Star className='size-5' fill='currentColor' /></button>)}</div></div><div className='space-y-2 md:col-span-3'><Label htmlFor='review-text'>نص التقييم</Label><Textarea id='review-text' value={text} onChange={(event) => setText(event.target.value.slice(0, 500))} placeholder='مثال: البرغر طازج والطعم ممتاز.' required /></div><Button type='submit' className='w-fit' disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'نشر التقييم'}</Button></form></CardContent></Card>
}
