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

const schema = z.object({
  label: z.string().min(1, 'الرجاء إدخال اسم/رقم الطاولة.'),
})

interface AddTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddTableDialog({ open, onOpenChange }: AddTableDialogProps) {
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
      toast.success('تمت إضافة الطاولة.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر إضافة الطاولة.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>إضافة طاولة جديدة</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
            <FormField
              control={form.control}
              name='label'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم/رقم الطاولة</FormLabel>
                  <FormControl>
                    <Input placeholder='طاولة 5' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type='submit' disabled={createTable.isPending}>
                {createTable.isPending && <Loader2 className='animate-spin' />}
                إضافة
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
