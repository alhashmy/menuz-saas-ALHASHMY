import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { restaurantSettingsQueryKey, useRestaurantSettingsApi } from '@/features/orders/restaurant-settings-api'
import { ContentSection } from './components/content-section'

type RestaurantSettingsValues = {
  name: string
  slug: string
  ordering_mode: 'system' | 'whatsapp'
  whatsapp_number: string
  google_maps_url: string
  website_url: string
  instagram_url: string
  facebook_url: string
  tiktok_url: string
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
  const queryClient = useQueryClient()
  const { fetchSettings, updateSettings } = useRestaurantSettingsApi()
  const form = useForm<RestaurantSettingsValues>({
    defaultValues: {
      name: '',
      slug: '',
      ordering_mode: 'system',
      whatsapp_number: '',
      google_maps_url: '', website_url: '', instagram_url: '', facebook_url: '', tiktok_url: '',
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
          google_maps_url: settings.google_maps_url ?? '',
          website_url: settings.website_url ?? '',
          instagram_url: settings.instagram_url ?? '',
          facebook_url: settings.facebook_url ?? '',
          tiktok_url: settings.tiktok_url ?? '',
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
      const updated = await updateSettings(restaurant.id, {
        name: values.name.trim(),
        slug,
        ordering_mode: values.ordering_mode,
        whatsapp_number:
          values.ordering_mode === 'whatsapp'
            ? values.whatsapp_number.trim()
            : null,
        google_maps_url: values.google_maps_url.trim() || null,
        website_url: values.website_url.trim() || null,
        instagram_url: values.instagram_url.trim() || null,
        facebook_url: values.facebook_url.trim() || null,
        tiktok_url: values.tiktok_url.trim() || null,
      })
      const nextValues: RestaurantSettingsValues = {
        ...values,
        name: updated.name,
        slug: updated.slug,
        ordering_mode: updated.ordering_mode,
        whatsapp_number: updated.whatsapp_number ?? '',
        google_maps_url: updated.google_maps_url ?? '',
        website_url: updated.website_url ?? '',
        instagram_url: updated.instagram_url ?? '',
        facebook_url: updated.facebook_url ?? '',
        tiktok_url: updated.tiktok_url ?? '',
      }
      // تحديث فوري للـ Header/الروابط، ثم إعادة جلب موثقة لأي مكوّن مشترك.
      setRestaurant({ ...restaurant, name: updated.name, slug: updated.slug })
      form.reset(nextValues)
      queryClient.setQueryData(restaurantSettingsQueryKey(restaurant.id), updated)
      await queryClient.invalidateQueries({
        queryKey: restaurantSettingsQueryKey(restaurant.id),
      })
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
        <fieldset className='space-y-4 rounded-xl border p-4'>
          <legend className='px-1 text-sm font-medium'>روابط التواصل والموقع</legend>
          <p className='text-xs text-muted-foreground'>تظهر الروابط التي تملؤها فقط في المنيو العام.</p>
          {([
            ['google_maps_url', 'رابط خرائط Google'], ['website_url', 'الموقع الإلكتروني'],
            ['instagram_url', 'رابط Instagram'], ['facebook_url', 'رابط Facebook'], ['tiktok_url', 'رابط TikTok'],
          ] as const).map(([field, label]) => <div className='space-y-2' key={field}><Label htmlFor={field}>{label}</Label><Input id={field} type='url' dir='ltr' placeholder='https://…' {...form.register(field)} /></div>)}
        </fieldset>
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
