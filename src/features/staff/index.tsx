import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore, type StaffRole } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'

type StaffMember = { id: string; user_id: string; role: StaffRole; created_at: string }
const roles: { value: StaffRole; label: string }[] = [{ value: 'owner', label: 'مالك' }, { value: 'manager', label: 'مدير' }, { value: 'cashier', label: 'كاشير' }, { value: 'staff', label: 'موظف' }]
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function StaffManagementPage() {
  const restaurant = useAuthStore((state) => state.restaurant)
  const currentUserId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const restaurantId = restaurant?.id ?? null
  const canManage = restaurant?.role === 'owner' || restaurant?.role === 'manager'
  const [userId, setUserId] = useState('')
  const [newRole, setNewRole] = useState<StaffRole>('staff')
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null)
  const { data: team = [], isLoading } = useQuery({ queryKey: ['restaurant-staff', restaurantId], enabled: Boolean(restaurantId), queryFn: async (): Promise<StaffMember[]> => { const { data, error } = await supabase.from('restaurant_staff').select('id, user_id, role, created_at').eq('restaurant_id', restaurantId!).order('created_at'); if (error) throw error; return data as StaffMember[] } })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['restaurant-staff', restaurantId] })
  const addStaff = useMutation({ mutationFn: async () => { if (!restaurantId || !uuidPattern.test(userId.trim())) throw new Error('أدخل المعرّف UUID الصحيح لحساب الموظف.'); const { error } = await supabase.from('restaurant_staff').insert({ restaurant_id: restaurantId, user_id: userId.trim(), role: newRole }); if (error) throw error }, onSuccess: () => { setUserId(''); setNewRole('staff'); void refresh(); toast.success('تمت إضافة الموظف.') } })
  const updateRole = useMutation({ mutationFn: async ({ id, role }: { id: string; role: StaffRole }) => { const { error } = await supabase.from('restaurant_staff').update({ role }).eq('id', id); if (error) throw error }, onSuccess: () => { void refresh(); toast.success('تم تحديث الصلاحية.') } })
  const removeStaff = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('restaurant_staff').delete().eq('id', id); if (error) throw error }, onSuccess: () => { void refresh(); setDeleteTarget(null); toast.success('تم حذف الموظف من الفريق.') } })
  return <><Header><div className='ms-auto' /><ThemeSwitch /><ProfileDropdown /></Header><Main dir='rtl'><div className='mb-6'><h1 className='flex items-center gap-2 text-2xl font-bold'><Users className='size-6 text-primary' /> الفريق</h1><p className='mt-1 text-sm text-muted-foreground'>إدارة حسابات فريق المطعم وصلاحياتهم.</p></div>
    {!canManage && <p className='mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800'>يمكنك عرض الفريق فقط؛ إدارة الصلاحيات للمالك والمدير.</p>}
    {canManage && <Card className='mb-5'><CardHeader><CardTitle>إضافة موظف</CardTitle></CardHeader><CardContent><form className='grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end' onSubmit={(event) => { event.preventDefault(); addStaff.mutate() }}><div className='space-y-2'><Label htmlFor='staff-user-id'>معرّف حساب الموظف (UUID)</Label><Input id='staff-user-id' value={userId} dir='ltr' placeholder='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' onChange={(event) => setUserId(event.target.value)} /></div><div className='space-y-2'><Label>الصلاحية</Label><Select value={newRole} onValueChange={(value) => setNewRole(value as StaffRole)}><SelectTrigger className='w-full'><SelectValue /></SelectTrigger><SelectContent>{roles.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select></div><Button type='submit' disabled={addStaff.isPending}><Plus className='size-4' /> إضافة</Button></form></CardContent></Card>}
    <Card><CardHeader><CardTitle>أعضاء الفريق ({team.length})</CardTitle></CardHeader><CardContent>{isLoading ? <p className='py-8 text-center text-muted-foreground'>جارٍ تحميل الفريق…</p> : <div className='space-y-2'>{team.map((member) => <div key={member.id} className='flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3'><div><p className='font-mono text-sm' dir='ltr'>{member.user_id}</p><p className='mt-1 text-xs text-muted-foreground'>انضم في {new Date(member.created_at).toLocaleDateString('ar-IQ')}</p></div><div className='flex items-center gap-2'>{canManage ? <Select value={member.role} onValueChange={(value) => updateRole.mutate({ id: member.id, role: value as StaffRole })}><SelectTrigger className='w-28'><SelectValue /></SelectTrigger><SelectContent>{roles.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select> : <span className='rounded-md bg-muted px-3 py-2 text-sm'>{roles.find((role) => role.value === member.role)?.label}</span>}{canManage && member.user_id !== currentUserId && <Button size='icon' variant='ghost' className='text-destructive' onClick={() => setDeleteTarget(member)} aria-label='حذف الموظف'><Trash2 className='size-4' /></Button>}</div></div>)}</div>}</CardContent></Card>
    <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title='حذف الموظف من الفريق؟' desc='سيُسحب وصول هذا الحساب إلى المطعم فوراً.' confirmText='حذف الموظف' cancelBtnText='إلغاء' destructive isLoading={removeStaff.isPending} handleConfirm={() => deleteTarget && removeStaff.mutate(deleteTarget.id)} />
  </Main></>
}
