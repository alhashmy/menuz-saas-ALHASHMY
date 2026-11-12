import { createFileRoute, redirect } from '@tanstack/react-router'
import { SupportPage } from './SupportPage'

export const Route = createFileRoute('/_authenticated/support/')({
  beforeLoad: async () => {
    const { useAuthStore } = await import('@/stores/auth-store')
    const userType = useAuthStore.getState().userType
    if (userType === 'root_owner' || userType === 'sub_admin') {
      throw redirect({ to: '/super-admin' })
    }
  },
  component: SupportPage,
})