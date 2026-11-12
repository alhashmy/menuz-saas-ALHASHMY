import { createFileRoute, redirect } from '@tanstack/react-router'
import { ChatPage } from './ChatPage'

export const Route = createFileRoute('/_authenticated/super-admin/chat/$restaurantId')({
  beforeLoad: async () => {
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      throw redirect({ to: '/sign-in' })
    }
    const { data: admin } = await supabase
      .from('platform_admins')
      .select('is_active')
      .eq('user_id', data.user.id)
      .maybeSingle()
    if (!admin?.is_active) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ChatPage,
})