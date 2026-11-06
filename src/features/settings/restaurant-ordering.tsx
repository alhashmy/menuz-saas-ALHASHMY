import { ContentSection } from './components/content-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAuthStore } from '@/stores/auth-store'
import { useRestaurantSettingsApi } from '@/features/orders/restaurant-settings-api'
import { useState } from 'react'
import { toast } from 'sonner'

export function SettingsRestaurantOrdering() {
  const { restaurant } = useAuthStore()
  const restaurantId = restaurant?.id
  const { updateSettings } = useRestaurantSettingsApi()

  const [mode, setMode] = useState<'system' | 'whatsapp'>('system')
  const [whatsappNum, setWhatsappNum] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSave() {
    if (!restaurantId) return

    if (mode === 'whatsapp' && !whatsappNum.trim()) {
      toast.error('يرجى إرفاق رقم واتساب لاستقبال الطلبات عليه.')
      return
    }

    setIsLoading(true)
    try {
      await updateSettings(restaurantId, {
        ordering_mode: mode,
        whatsapp_number: mode === 'whatsapp' && whatsappNum ? whatsappNum : null,
      })
      toast.success('تم حفظ الإعدادات بنجاح.')
    } catch {
      toast.error('تعذر حفظ الإعدادات.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !restaurantId) {
    return (
      <ContentSection title='إعدادات استلام الطلبات' desc=''>
        <div className='flex h-40 items-center justify-center text-muted-foreground'>
          جارٍ التحميل...
        </div>
      </ContentSection>
    )
  }

  return (
    <ContentSection
      title='إعدادات استلام الطلبات'
      desc='اختر طريقة استقبال طلبات الزبائن من منيو المطعم.'
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className='space-y-6'>
        <div className='space-y-4'>
          <Label htmlFor='ordering_mode'>استقبال الطلبات عبر</Label>
          <RadioGroup
            onValueChange={(val) => setMode(val as 'system' | 'whatsapp')}
            value={mode}
            className='gap-4'
          >
            <div className='flex items-center space-x-2'>
              <RadioGroupItem id='system' value='system' />
              <Label htmlFor='system'>نظام الإدارة</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem id='whatsapp' value='whatsapp' />
              <Label htmlFor='whatsapp'>واتساب</Label>
            </div>
          </RadioGroup>
        </div>

        {mode === 'whatsapp' && (
          <div className='mt-4 space-y-2'>
            <Label htmlFor='whatsappNumber'>رقم الواتساب (إجباري)</Label>
            <Input
              id='whatsappNumber'
              type='tel'
              placeholder='أدخل رقم الهاتف...'
              value={whatsappNum}
              onChange={(e) => setWhatsappNum(e.target.value)}
              required
            />
            <p className='text-xs text-muted-foreground'>
              يُستخدم هذا الرقم لتوجيه طلبات الزبائن عبر واتساب.
            </p>
          </div>
        )}

        <Button type='submit' disabled={isLoading} className='w-full'>
          {isLoading ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </form>
    </ContentSection>
  )
}
