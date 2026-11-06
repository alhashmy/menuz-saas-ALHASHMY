import { z } from 'zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const profileFormSchema = z.object({
  username: z
    .string('الرجاء إدخال اسم المستخدم.')
    .min(2, 'يجب ألا يقل اسم المستخدم عن حرفين.')
    .max(30, 'يجب ألا يزيد اسم المستخدم عن 30 حرفاً.'),
  email: z.email({
    error: (iss) =>
      iss.input === undefined
        ? 'الرجاء تحديد بريد إلكتروني للعرض.'
        : undefined,
  }),
  bio: z.string().max(160).min(4),
  urls: z
    .array(
      z.object({
        value: z.url('الرجاء إدخال رابط صحيح.'),
      })
    )
    .optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

// This can come from your database or API.
const defaultValues: Partial<ProfileFormValues> = {
  bio: 'لدي جهاز كمبيوتر.',
  urls: [
    { value: 'https://shadcn.com' },
    { value: 'http://twitter.com/shadcn' },
  ],
}

export function ProfileForm() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: 'onChange',
  })

  const { fields, append } = useFieldArray({
    name: 'urls',
    control: form.control,
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => showSubmittedData(data))}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم المستخدم</FormLabel>
              <FormControl>
                <Input placeholder='اسم المستخدم' {...field} />
              </FormControl>
              <FormDescription>
                هذا هو اسم العرض العام الخاص بك. يمكن أن يكون اسمك الحقيقي أو
                لقباً. يمكنك تغييره مرة واحدة فقط كل 30 يوماً.
              </FormDescription>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='تحديد بريد إلكتروني تم التحقق منه للعرض' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='m@example.com'>m@example.com</SelectItem>
                  <SelectItem value='m@google.com'>m@google.com</SelectItem>
                  <SelectItem value='m@support.com'>m@support.com</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                يمكنك إدارة عناوين البريد الإلكتروني التي تم التحقق منها في{' '}
                <Link to='/'>إعدادات البريد الإلكتروني</Link>.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='bio'
          render={({ field }) => (
            <FormItem>
              <FormLabel>السيرة الذاتية</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='أخبرنا قليلاً عن نفسك'
                  className='resize-none'
                  {...field}
                />
              </FormControl>
              <FormDescription>
                يمكنك <span>@mention</span> المستخدمين والمنظمات الآخرين للربط بهم.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          {fields.map((field, index) => (
            <FormField
              control={form.control}
              key={field.id}
              name={`urls.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(index !== 0 && 'sr-only')}>
                    الروابط
                  </FormLabel>
                  <FormDescription className={cn(index !== 0 && 'sr-only')}>
                    أضف روابط لموقعك الإلكتروني أو مدونتك أو ملفاتك الشخصية على وسائل التواصل الاجتماعي.
                  </FormDescription>
                  <FormControl className={cn(index !== 0 && 'mt-1.5')}>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={() => append({ value: '' })}
          >
            إضافة رابط
          </Button>
        </div>
        <Button type='submit'>تحديث الملف الشخصي</Button>
      </form>
    </Form>
  )
}
