import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useMenuItems } from '@/features/menu/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
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
import { useUpsertOffer } from '../api'
import type { Offer } from '../types'

const schema = z
  .object({
    title_ar: z.string().min(1, 'اسم العرض مطلوب.'),
    scope: z.enum(['item', 'order']),
    discount_kind: z.enum(['percentage', 'fixed']),
    discount_value: z
      .string()
      .min(1, 'قيمة الخصم مطلوبة.')
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, 'أدخل رقماً أكبر من صفر.'),
    item_id: z.string().optional(),
    promo_code: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'item' && !data.item_id) {
      ctx.addIssue({
        code: 'custom',
        path: ['item_id'],
        message: 'الرجاء اختيار الوجبة المستهدفة بالخصم.',
      })
    }
    if (data.scope === 'order' && !data.promo_code?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['promo_code'],
        message: 'الرجاء إدخال كود البرومو.',
      })
    }
    if (
      data.discount_kind === 'percentage' &&
      Number(data.discount_value) > 100
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['discount_value'],
        message: 'النسبة المئوية لا يمكن أن تتجاوز 100.',
      })
    }
  })

interface OfferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offer?: Offer | null
}

export function OfferDialog({ open, onOpenChange, offer }: OfferDialogProps) {
  const upsertOffer = useUpsertOffer()
  const { data: items = [] } = useMenuItems()
  const isEdit = !!offer

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title_ar: '',
      scope: 'item',
      discount_kind: 'percentage',
      discount_value: '10',
      item_id: '',
      promo_code: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title_ar: offer?.title_ar ?? '',
        scope: offer?.scope ?? 'item',
        discount_kind: offer?.discount_kind ?? 'percentage',
        discount_value: offer ? String(offer.discount_value) : '10',
        item_id: offer?.item_id ?? '',
        promo_code: offer?.promo_code ?? '',
      })
    }
  }, [open, offer, form])

  const scope = form.watch('scope')

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      await upsertOffer.mutateAsync({
        id: offer?.id,
        title: values.title_ar,
        title_ar: values.title_ar,
        scope: values.scope,
        discount_kind: values.discount_kind,
        discount_value: Number(values.discount_value),
        item_id: values.scope === 'item' ? values.item_id : null,
        promo_code: values.scope === 'order' ? values.promo_code : null,
      })
      toast.success(isEdit ? 'تم تحديث العرض.' : 'تم إنشاء العرض.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل العرض' : 'عرض جديد'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
            <FormField
              control={form.control}
              name='title_ar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم العرض</FormLabel>
                  <FormControl>
                    <Input placeholder='خصم نهاية الأسبوع' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='scope'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع العرض</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='item'>خصم على وجبة محددة</SelectItem>
                      <SelectItem value='order'>كود برومو على كامل الطلب</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {scope === 'item' ? (
              <FormField
                control={form.control}
                name='item_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوجبة المستهدفة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='اختر الوجبة' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name_ar ?? item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name='promo_code'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كود البرومو</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='SAVE10'
                        dir='ltr'
                        className='font-mono uppercase'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className='grid grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='discount_kind'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>طريقة الخصم</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='percentage'>نسبة مئوية %</SelectItem>
                        <SelectItem value='fixed'>مبلغ ثابت</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='discount_value'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>القيمة</FormLabel>
                    <FormControl>
                      <Input type='number' min='0' step='0.01' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type='submit' disabled={upsertOffer.isPending}>
                {upsertOffer.isPending && <Loader2 className='animate-spin' />}
                {isEdit ? 'حفظ التعديلات' : 'إنشاء العرض'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
