import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const items = [
  {
    id: 'orders',
    label: 'عرض الطلبات',
  },
  {
    id: 'cancelled_orders',
    label: 'عرض الطلبات الملغاة',
  },
  {
    id: 'menu_items',
    label: 'عرض عناصر القائمة',
  },
  {
    id: 'sales_stats',
    label: 'عرض إحصائيات المبيعات',
  },
  {
    id: 'offers',
    label: 'عرض العروض الترويجية',
  },
] as const

const displayFormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'يجب تحديد عنصر واحد على الأقل.',
  }),
})

type DisplayFormValues = z.infer<typeof displayFormSchema>

// This can come from your database or API.
const defaultValues: Partial<DisplayFormValues> = {
  items: ['orders', 'menu_items'],
}

export function DisplayForm() {
  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => showSubmittedData(data))}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='items'
          render={() => (
            <>
              <div className='mb-4'>
                <FormLabel className='text-base'>عناصر الشريط الجانبي</FormLabel>
                <FormDescription>
                  حدد العناصر التي تريد عرضها في الشريط الجانبي.
                </FormDescription>
              </div>
              {items.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name='items'
                  render={({ field }) => (
                    <FormItem
                      key={item.id}
                      className='flex flex-row items-start'
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(item.id)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...field.value, item.id])
                              : field.onChange(
                                  field.value?.filter(
                                    (value) => value !== item.id
                                  )
                                )
                          }}
                        />
                      </FormControl>
                      <FormLabel className='font-normal'>
                        {item.label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
              <FormMessage />
            </>
          )}
        />
        <Button type='submit'>تحديث العرض</Button>
      </form>
    </Form>
  )
}
