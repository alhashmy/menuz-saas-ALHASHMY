import { useEffect, useState } from 'react'
import { Clock3, MapPin, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

type Hours = { id?: string; day_of_week: number; is_open: boolean; opens_at: string; closes_at: string }
type Zone = { id?: string; name: string; delivery_fee: number; minimum_order: number; is_active: boolean; sort_order: number }
const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const defaultHours = (): Hours[] => days.map((_, day_of_week) => ({ day_of_week, is_open: true, opens_at: '09:00', closes_at: '23:00' }))

export function OperationsSettings({ restaurantId }: { restaurantId: string | null }) {
  const [hours, setHours] = useState<Hours[]>(defaultHours)
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!restaurantId) return
    let active = true
    void Promise.all([
      supabase.from('restaurant_operating_hours').select('id, day_of_week, is_open, opens_at, closes_at').eq('restaurant_id', restaurantId).order('day_of_week'),
      supabase.from('delivery_zones').select('id, name, delivery_fee, minimum_order, is_active, sort_order').eq('restaurant_id', restaurantId).order('sort_order'),
    ]).then(([hoursResult, zonesResult]) => {
      if (!active) return
      if (hoursResult.error || zonesResult.error) {
        toast.error('إعدادات التشغيل تحتاج تطبيق ترحيل قاعدة البيانات 0005 أولًا.')
      } else {
        if (hoursResult.data?.length) setHours(hoursResult.data as Hours[])
        setZones((zonesResult.data ?? []) as Zone[])
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [restaurantId])

  const updateHour = (day: number, patch: Partial<Hours>) => setHours((current) => current.map((entry) => entry.day_of_week === day ? { ...entry, ...patch } : entry))
  const updateZone = (index: number, patch: Partial<Zone>) => setZones((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, ...patch } : entry))

  async function save() {
    if (!restaurantId) return
    setSaving(true)
    try {
      const cleanZones = zones.map((zone, sort_order) => ({ ...zone, restaurant_id: restaurantId, sort_order, name: zone.name.trim().slice(0, 80) })).filter((zone) => zone.name.length >= 2)
      const { error: hoursError } = await supabase.from('restaurant_operating_hours').upsert(hours.map((entry) => ({ ...entry, restaurant_id: restaurantId })), { onConflict: 'restaurant_id,day_of_week' })
      if (hoursError) throw hoursError
      const existingIds = zones.map((zone) => zone.id).filter(Boolean)
      const { error: zonesError } = await supabase.from('delivery_zones').upsert(cleanZones, { onConflict: 'id' })
      if (zonesError) throw zonesError
      const removedIds = existingIds.filter((id) => !cleanZones.some((zone) => zone.id === id))
      if (removedIds.length) { const { error } = await supabase.from('delivery_zones').delete().in('id', removedIds); if (error) throw error }
      toast.success('تم حفظ أوقات التشغيل ومناطق التوصيل.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذّر حفظ الإعدادات.') } finally { setSaving(false) }
  }

  return <section className='rounded-2xl border border-white/8 bg-white/[0.035] p-5'>
    <div className='flex items-center justify-between gap-3'><div><h2 className='flex items-center gap-2 text-sm font-bold'><Clock3 className='size-4 text-emerald-300' /> التشغيل والتوصيل</h2><p className='mt-1 text-xs text-slate-400'>الطلب متاح فقط خلال الأوقات الفعالة وحالة المطعم المفتوحة.</p></div><Button size='sm' onClick={save} disabled={saving || loading}><Save className='ml-1 size-3.5' />{saving ? 'جارٍ الحفظ' : 'حفظ'}</Button></div>
    <div className='mt-5 grid gap-5 xl:grid-cols-2'>
      <div><h3 className='mb-2 text-xs font-bold text-slate-200'>جدول أوقات التشغيل</h3><div className='space-y-2'>{hours.map((entry) => <div key={entry.day_of_week} className='grid grid-cols-[72px_1fr_1fr_auto] items-center gap-2 rounded-xl border border-white/8 bg-slate-950/25 p-2 text-[11px]'><span>{days[entry.day_of_week]}</span><Input type='time' value={entry.opens_at} disabled={!entry.is_open} onChange={(event) => updateHour(entry.day_of_week, { opens_at: event.target.value })} className='h-8 border-white/10 bg-white/5 text-xs' /><Input type='time' value={entry.closes_at} disabled={!entry.is_open} onChange={(event) => updateHour(entry.day_of_week, { closes_at: event.target.value })} className='h-8 border-white/10 bg-white/5 text-xs' /><Switch checked={entry.is_open} onCheckedChange={(is_open) => updateHour(entry.day_of_week, { is_open })} /></div>)}</div></div>
      <div><div className='mb-2 flex items-center justify-between'><h3 className='flex items-center gap-1 text-xs font-bold text-slate-200'><MapPin className='size-3.5 text-emerald-300' /> أسعار التوصيل حسب المنطقة</h3><Button size='sm' variant='outline' className='h-7 border-white/10 bg-white/5 text-xs' onClick={() => setZones((current) => [...current, { name: '', delivery_fee: 0, minimum_order: 0, is_active: true, sort_order: current.length }])}><Plus className='size-3' /> منطقة</Button></div><div className='space-y-2'>{zones.length ? zones.map((zone, index) => <div key={zone.id ?? index} className='grid grid-cols-[1fr_82px_82px_auto_auto] gap-2 rounded-xl border border-white/8 bg-slate-950/25 p-2'><Input value={zone.name} maxLength={80} onChange={(event) => updateZone(index, { name: event.target.value })} placeholder='اسم المنطقة' className='h-8 border-white/10 bg-white/5 text-xs' /><Input type='number' min='0' value={zone.delivery_fee} onChange={(event) => updateZone(index, { delivery_fee: Number(event.target.value) || 0 })} placeholder='التوصيل' className='h-8 border-white/10 bg-white/5 text-xs' /><Input type='number' min='0' value={zone.minimum_order} onChange={(event) => updateZone(index, { minimum_order: Number(event.target.value) || 0 })} placeholder='الحد الأدنى' className='h-8 border-white/10 bg-white/5 text-xs' /><Switch checked={zone.is_active} onCheckedChange={(is_active) => updateZone(index, { is_active })} /><Button variant='ghost' size='icon' className='size-8 text-red-300' onClick={() => setZones((current) => current.filter((_, currentIndex) => currentIndex !== index))}><Trash2 className='size-3.5' /></Button></div>) : <div className='rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500'>أضف المناطق ليظهر سعر التوصيل للزبون.</div>}</div></div>
    </div>
  </section>
}
