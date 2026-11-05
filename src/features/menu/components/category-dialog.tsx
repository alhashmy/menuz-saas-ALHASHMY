import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { useCreateCategory, useUpdateCategory } from '../api'
import type { MenuCategory } from '../types'

const schema = z.object({
  name: z.string().min(1, 'اسم القسم بالإنجليزية مطلوب.'),
  name_ar: z.string().min(1, 'اسم القسم بالعربية مطلوب.'),
})

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: MenuCategory | null
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
}: CategoryDialogProps) {
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const isEdit = !!category

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', name_ar: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name ?? '',
        name_ar: category?.name_ar ?? '',
      })
    }
  }, [open, category, form])

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({ id: category.id, ...values })
        toast.success('تم تحديث القسم.')
      } else {
        await createCategory.mutateAsync(values)
        toast.success('تم إضافة القسم.')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.')
    }
  }

  const isLoading = createCategory.isPending || updateCategory.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل القسم' : 'إضافة قسم جديد'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
            <FormField
              control={form.control}
              name='name_ar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم القسم (عربي)</FormLabel>
                  <FormControl>
                    <Input placeholder='المقبلات' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم القسم (إنجليزي)</FormLabel>
                  <FormControl>
                    <Input placeholder='Starters' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='animate-spin' />}
                {isEdit ? 'حفظ التعديلات' : 'إضافة القسم'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
