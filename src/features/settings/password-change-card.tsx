import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Eye, EyeOff, Loader2, Shield } from 'lucide-react'

interface ChangePasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function PasswordChangeCard() {
  const { user, restaurant } = useAuthStore()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formData, setFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Partial<ChangePasswordFormData>>({})

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormData) => {
      // Step 1: Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: data.currentPassword,
      })

      if (signInError) {
        throw new Error('كلمة المرور الحالية غير صحيحة')
      }

      // Step 2: Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      })

      if (updateError) {
        throw updateError
      }

      // Step 3: Log the password change
      const { error: logError } = await supabase.rpc('log_own_password_change', {
        p_new_password: data.newPassword,
        p_entity_name: restaurant?.name || user!.email,
      })

      if (logError) {
        console.error('Failed to log password change:', logError)
        // Don't throw here as the password was already changed
      }

      return true
    },
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور بنجاح')
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر تغيير كلمة المرور')
    },
  })

  const validateForm = (): boolean => {
    const newErrors: Partial<ChangePasswordFormData> = {}

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'كلمة المرور الحالية مطلوبة'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'كلمة المرور الجديدة مطلوبة'
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'تأكيد كلمة المرور مطلوب'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      changePasswordMutation.mutate(formData)
    }
  }

  const generatePassword = () => {
    const length = 16
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setFormData(prev => ({ ...prev, newPassword: password, confirmPassword: password }))
  }

  return (
    <Card className='border-primary/20'>
      <CardHeader className='flex flex-row items-center justify-between pb-3'>
        <CardTitle className='flex items-center gap-2'>
          <Shield className='size-5 text-primary' />
          الأمان وتغيير كلمة المرور
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <p className='text-sm text-muted-foreground'>
            قم بتغيير كلمة المرور الخاصة بك. سيتم إبلاغ المالك الأعلى بهذا التغيير تلقائياً.
          </p>

          <Separator />

          <div className='space-y-2'>
            <Label htmlFor='current-password'>كلمة المرور الحالية</Label>
            <div className='relative'>
              <Input
                id='current-password'
                type={showCurrent ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder='أدخل كلمة المرور الحالية'
                disabled={changePasswordMutation.isPending}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='absolute inset-y-0 r-0'
                onClick={() => setShowCurrent(!showCurrent)}
                disabled={changePasswordMutation.isPending}
              >
                {showCurrent ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className='text-xs text-destructive'>{errors.currentPassword}</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='new-password'>كلمة المرور الجديدة</Label>
            <div className='relative'>
              <Input
                id='new-password'
                type={showNew ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder='كلمة مرور قوية (8+ أحرف)'
                disabled={changePasswordMutation.isPending}
                minLength={8}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='absolute inset-y-0 r-0'
                onClick={() => setShowNew(!showNew)}
                disabled={changePasswordMutation.isPending}
              >
                {showNew ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
              </Button>
            </div>
            {errors.newPassword && (
              <p className='text-xs text-destructive'>{errors.newPassword}</p>
            )}
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='confirm-password'>تأكيد كلمة المرور الجديدة</Label>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={generatePassword}
                disabled={changePasswordMutation.isPending}
                className='gap-1'
              >
                <Loader2 className='size-3' />
                توليد كلمة مرور قوية
              </Button>
            </div>
            <div className='relative'>
              <Input
                id='confirm-password'
                type={showConfirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder='أعد إدخال كلمة المرور الجديدة'
                disabled={changePasswordMutation.isPending}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='absolute inset-y-0 r-0'
                onClick={() => setShowConfirm(!showConfirm)}
                disabled={changePasswordMutation.isPending}
              >
                {showConfirm ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className='text-xs text-destructive'>{errors.confirmPassword}</p>
            )}
          </div>

          <Button
            type='submit'
            className='w-full'
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? (
              <>
                <Loader2 className='mr-2 size-4 animate-spin' />
                جاري التغيير...
              </>
            ) : (
              'تغيير كلمة المرور'
            )}
          </Button>

          <p className='text-xs text-muted-foreground text-center'>
            <CheckCircle className='inline size-3 mr-1 text-emerald-600' />
            سيتم تسجيل هذا التغيير في سجل كلمات المرور وإعلام المالك الأعلى.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}