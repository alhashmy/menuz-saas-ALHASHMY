import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    // تأكد من وجود جلسة Supabase فعلية قبل السماح بدخول لوحة التحكم
    let session = useAuthStore.getState().session
    if (!session) {
      const { data } = await supabase.auth.getSession()
      session = data.session
      useAuthStore.getState().setSession(session)
    }

    if (!session) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})
