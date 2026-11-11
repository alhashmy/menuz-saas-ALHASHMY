import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useRestaurantSettingsApi } from '@/features/orders/restaurant-settings-api'
import { ContentSection } from './components/content-section'

type RestaurantSettingsValues = {
  name: string
  slug: string
  ordering_mode: 'system' | 'whatsapp'
  whatsapp_number: string
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function RestaurantSettingsForm() {
  const restaurant = useAuthStore((state) => state.restaurant)
  const setRestaurant = useAuthStore((state) => state.setRestaurant)
  const { fetchSettings, updateSettings } = useRestaurantSettingsApi()
  const form = useForm<RestaurantSettingsValues>({
    defaultValues: {
      name: '',
      slug: '',
      ordering_mode: 'system',
      whatsapp_number: '',
    },
  })
  const orderingMode = form.watch('ordering_mode')

  useEffect(() => {
    if (!restaurant?.id) return
    let active = true
    void fetchSettings(restaurant.id)
      .then((settings) => {
        if (!active || !settings) return
        form.reset({
          name: settings.name ?? '',
          slug: settings.slug ?? '',
          ordering_mode: settings.ordering_mode,
          whatsapp_number: settings.whatsapp_number ?? '',
        })
      })
      .catch(() => toast.error('تعذر تحميل إعدادات المطعم.'))
    return () => {
      active = false
    }
  }, [fetchSettings, form, restaurant?.id])

  async function onSubmit(values: RestaurantSettingsValues) {
    if (!restaurant) return
    const slug = normalizeSlug(values.slug)
    if (!slug) {
      form.setError('slug', { message: 'اكتب رابطًا إنجليزيًا صالحًا.' })
      return
    }
    if (values.ordering_mode === 'whatsapp' && !values.whatsapp_number.trim()) {
      form.setError('whatsapp_number', {
        message: 'رقم واتساب مطلوب لهذا الخيار.',
      })
      return
    }
    try {
      await updateSettings(restaurant.id, {
        name: values.name.trim(),
        slug,
        ordering_mode: values.ordering_mode,
        whatsapp_number:
          values.ordering_mode === 'whatsapp'
            ? values.whatsapp_number.trim()
            : null,
      })
      setRestaurant({ ...restaurant, name: values.name.trim(), slug })
      form.setValue('slug', slug)
      toast.success('تم حفظ إعدادات المطعم.')
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        form.setError('slug', { message: 'هذا الرابط مستخدم بالفعل.' })
      } else {
        toast.error(
          error instanceof Error ? error.message : 'تعذر حفظ الإعدادات.'
        )
      }
    }
  }

  return (
    <ContentSection
      title='إعدادات المطعم'
      desc='بيانات الاستقبال ورابط المنيو العام.'
    >
      <form
        className='space-y-6'
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <div className='space-y-2'>
          <Label htmlFor='restaurant-name'>اسم المطعم</Label>
          <Input
            id='restaurant-name'
            {...form.register('name', { required: 'اسم المطعم مطلوب.' })}
          />
          {form.formState.errors.name && (
            <p className='text-xs text-destructive'>
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div className='space-y-2'>
          <Label htmlFor='restaurant-slug'>رابط المنيو (Slug)</Label>
          <div className='flex items-center gap-2' dir='ltr'>
            <span className='text-sm text-muted-foreground'>
              {window.location.origin}/menu/
            </span>
            <Input
              id='restaurant-slug'
              className='font-mono'
              placeholder='burger-king'
              {...form.register('slug', {
                required: 'رابط المنيو مطلوب.',
                pattern: {
                  value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                  message: 'استخدم أحرفًا إنجليزية وأرقامًا وشرطات فقط.',
                },
              })}
            />
          </div>
          {form.formState.errors.slug && (
            <p className='text-xs text-destructive'>
              {form.formState.errors.slug.message}
            </p>
          )}
        </div>
        <fieldset className='space-y-3'>
          <Label>استقبال الطلبات عبر</Label>
          <RadioGroup
            value={orderingMode}
            onValueChange={(value) =>
              form.setValue(
                'ordering_mode',
                value as RestaurantSettingsValues['ordering_mode'],
                { shouldDirty: true }
              )
            }
            className='gap-3'
          >
            <div className='flex items-center gap-2'>
              <RadioGroupItem id='system' value='system' />
              <Label htmlFor='system'>نظام الإدارة</Label>
            </div>
            <div className='flex items-center gap-2'>
              <RadioGroupItem id='whatsapp' value='whatsapp' />
              <Label htmlFor='whatsapp'>واتساب</Label>
            </div>
          </RadioGroup>
        </fieldset>
        {orderingMode === 'whatsapp' && (
          <div className='space-y-2'>
            <Label htmlFor='whatsapp-number'>رقم واتساب</Label>
            <Input
              id='whatsapp-number'
              type='tel'
              {...form.register('whatsapp_number')}
              placeholder='+964 7XX XXX XXXX'
            />
            {form.formState.errors.whatsapp_number && (
              <p className='text-xs text-destructive'>
                {form.formState.errors.whatsapp_number.message}
              </p>
            )}
          </div>
        )}
        <Button
          type='submit'
          className='w-full'
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </form>
    </ContentSection>
  )
}
