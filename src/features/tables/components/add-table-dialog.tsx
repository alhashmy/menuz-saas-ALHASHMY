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
import { useCreateTable } from '../api'
import { useLanguage } from '@/i18n'

const schema = z.object({
  label: z.string().min(1, 'الرجاء إدخال اسم/رقم الطاولة.'),
})

interface AddTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddTableDialog({ open, onOpenChange }: AddTableDialogProps) {
  const { language, t } = useLanguage()
  const createTable = useCreateTable()

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { label: '' },
  })

  useEffect(() => {
    if (open) form.reset({ label: '' })
  }, [open, form])

  async function onSubmit(values: z.infer<typeof schema>) {
    try {
      await createTable.mutateAsync(values.label)
      toast.success(language === 'ar' ? 'تمت إضافة الطاولة.' : 'Table added.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : language === 'ar' ? 'تعذر إضافة الطاولة.' : 'Unable to add the table.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>{language === 'ar' ? 'إضافة طاولة جديدة' : 'Add a new table'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
            <FormField
              control={form.control}
              name='label'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === 'ar' ? 'اسم/رقم الطاولة' : 'Table name or number'}</FormLabel>
                  <FormControl>
                    <Input placeholder={language === 'ar' ? 'طاولة 5' : 'Table 5'} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type='submit' disabled={createTable.isPending}>
                {createTable.isPending && <Loader2 className='animate-spin' />}
                {t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
