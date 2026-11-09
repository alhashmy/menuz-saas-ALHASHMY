import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { getMenuImageUrl, uploadMenuImage } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpsertMenuItem } from '../api'
import type { MenuCategory, MenuItem } from '../types'

const schema = z.object({
  category_id: z.string().min(1, 'الرجاء اختيار القسم.'),
  name_ar: z.string().min(1, 'اسم الوجبة بالعربية مطلوب.'),
  description_ar: z.string().optional(),
  description: z.string().optional(),
  price: z
    .string()
    .min(1, 'السعر مطلوب.')
    .refine(
      (v) => !Number.isNaN(Number(v)) && Number(v) >= 0,
      'السعر يجب أن يكون رقماً أكبر من أو يساوي صفر.'
    ),
})

interface ItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: MenuCategory[]
  item?: MenuItem | null
}

export function ItemDialog({
  open,
  onOpenChange,
  categories,
  item,
}: ItemDialogProps) {
  const upsertItem = useUpsertMenuItem()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  const isEdit = !!item
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      category_id: '',
      name_ar: '',
      description_ar: '',
      description: '',
      price: '0',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        category_id: item?.category_id ?? categories[0]?.id ?? '',
        name_ar: item?.name_ar ?? '',
        description_ar: item?.description_ar ?? '',
        description: item?.description ?? '',
        price: item ? String(item.price) : '0',
      })
      // eslint-disable-next-line react-hooks/set-state-in-effect -- تهيئة مسار الصورة الحالية عند فتح النافذة
      setImagePath(item?.image_path ?? null)
      setImageFile(null)
    }
  }, [open, item, categories, form])

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      let finalImageUrl = imagePath
      if (imageFile && restaurantId) {
        const uploadedPath = await uploadMenuImage(restaurantId, 'items', imageFile)
        const SUPABASE_PROJECT_URL = 'https://fcwxelswjoiwndlzqhys.supabase.co'
        finalImageUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/menu-images/${uploadedPath}`
      }

      await upsertItem.mutateAsync({
        id: item?.id,
        ...values,
        name: values.name_ar ?? '',
        name_ar: values.name_ar,
        description: values.description_ar ?? '',
        description_ar: values.description_ar,
        price: Number(values.price),
        image_path: finalImageUrl,
      })
      toast.success(isEdit ? 'تم تحديث الوجبة.' : 'تم إضافة الوجبة.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.')
    }
  }

  const previewUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : getMenuImageUrl(imagePath)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل الوجبة' : 'إضافة وجبة جديدة'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
            <FormField
              control={form.control}
              name='category_id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>القسم</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='اختر القسم' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name_ar ?? cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='name_ar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم (عربي)</FormLabel>
                  <FormControl>
                    <Input placeholder='برجر لحم' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description_ar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف (عربي)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='قطعة لحم طازجة مع صلصة خاصة...'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='price'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>السعر</FormLabel>
                  <FormControl>
                    <Input type='number' step='0.01' min='0' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid gap-2'>
              <FormLabel>صورة الوجبة</FormLabel>
              <div className='flex items-center gap-4'>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt='معاينة'
                    className='size-16 rounded-lg border object-cover'
                  />
                )}
                <label className='flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted'>
                  <Upload className='size-4' />
                  اختر صورة
                  <input
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type='submit' disabled={upsertItem.isPending}>
                {upsertItem.isPending && <Loader2 className='animate-spin' />}
                {isEdit ? 'حفظ التعديلات' : 'إضافة الوجبة'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
