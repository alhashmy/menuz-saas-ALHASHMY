import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z
  .object({
    restaurantName: z.string().min(2, 'الرجاء إدخال اسم المطعم.'),
    email: z.email({
      error: (iss) =>
        iss.input === '' ? 'الرجاء إدخال بريدك الإلكتروني.' : undefined,
    }),
    password: z
      .string()
      .min(1, 'الرجاء إدخال كلمة المرور.')
      .min(7, 'يجب ألا تقل كلمة المرور عن 7 أحرف.'),
    confirmPassword: z.string().min(1, 'الرجاء تأكيد كلمة المرور.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين.',
    path: ['confirmPassword'],
  })

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const signUpWithPassword = useAuthStore((s) => s.signUpWithPassword)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurantName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    const { error } = await signUpWithPassword(
      data.email,
      data.password,
      data.restaurantName
    )
    setIsLoading(false)

    if (error) {
      toast.error(error)
      return
    }

    toast.success(`تم إنشاء حساب مطعم "${data.restaurantName}" بنجاح!`)
    navigate({ to: '/dashboard', replace: true })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='restaurantName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم المطعم</FormLabel>
              <FormControl>
                <Input placeholder='مطعم الأصالة' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>البريد الإلكتروني</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>كلمة المرور</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>تأكيد كلمة المرور</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <UserPlus />}
          إنشاء الحساب
        </Button>
      </form>
    </Form>
  )
}
