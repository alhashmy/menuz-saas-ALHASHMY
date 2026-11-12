import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import { SuperAdminDashboard } from '@/features/super-admin/SuperAdminDashboard'

async function checkPlatformAdminAccess(userId: string): Promise<boolean> {
  if (!userId) return false
  const { data, error } = await supabase
    .from('platform_admins')
    .select('is_active, role')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return false
  return data.is_active === true
}

function SuperAdminRouteComponent() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const [hasAccess, setHasAccess] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!isInitialized) return

    const checkAccess = async () => {
      setIsChecking(true)
      try {
        const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL
        const userEmail = user?.email
        const userRole = user?.user_metadata?.role || user?.app_metadata?.role

        const isRootOwner = superAdminEmail && userEmail === superAdminEmail
        const isSuperAdminRole = userRole === 'super_admin'
        const isPlatformAdmin = user ? await checkPlatformAdminAccess(user.id) : false

        const hasSuperAdminAccess = isRootOwner || isSuperAdminRole || isPlatformAdmin

        setHasAccess(hasSuperAdminAccess)
        if (!hasSuperAdminAccess) {
          navigate({ to: '/dashboard' })
        }
      } catch {
        setHasAccess(false)
        navigate({ to: '/dashboard' })
      } finally {
        setIsChecking(false)
      }
    }

    checkAccess()
  }, [isInitialized, user, navigate])

  if (!isInitialized || isChecking) {
    return (
      <div className='flex min-h-svh items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return <SuperAdminDashboard />
}

export const Route = createFileRoute('/_authenticated/super-admin/')({
  component: SuperAdminRouteComponent,
})