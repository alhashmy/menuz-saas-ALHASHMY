import { useNavigate, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const signOut = useAuthStore((s) => s.signOut)

  const handleSignOut = async () => {
    await signOut()
    // الحفاظ على المسار الحالي لإعادة التوجيه بعد تسجيل الدخول
    const currentPath = location.href
    navigate({
      to: '/sign-in',
      search: { redirect: currentPath },
      replace: true,
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='تسجيل الخروج'
      desc='هل أنت متأكد من رغبتك في تسجيل الخروج؟ ستحتاج لتسجيل الدخول مرة أخرى للوصول إلى حسابك.'
      confirmText='تسجيل الخروج'
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
