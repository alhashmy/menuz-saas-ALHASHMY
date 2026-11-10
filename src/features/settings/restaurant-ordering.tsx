import { ContentSection } from './components/content-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAuthStore } from '@/stores/auth-store'
import { useRestaurantSettingsApi } from '@/features/orders/restaurant-settings-api'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/i18n'

export function SettingsRestaurantOrdering() {
  const { language } = useLanguage()
  const { restaurant } = useAuthStore()
  const restaurantId = restaurant?.id
  const { fetchSettings, updateSettings } = useRestaurantSettingsApi()

  const [mode, setMode] = useState<'system' | 'whatsapp'>('system')
  const [whatsappNum, setWhatsappNum] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(() => !!restaurantId)

  useEffect(() => {
    if (!restaurantId) {
      return
    }
    let active = true
    void fetchSettings(restaurantId)
      .then((settings) => {
        if (!active || !settings) return
        setMode(settings.ordering_mode)
        setWhatsappNum(settings.whatsapp_number ?? '')
      })
      .catch(() => {
        if (active) toast.error(language === 'ar' ? 'تعذر تحميل إعدادات الطلبات.' : 'Unable to load ordering settings.')
      })
      .finally(() => {
        if (active) setIsFetching(false)
      })
    return () => {
      active = false
    }
  }, [fetchSettings, language, restaurantId])

  async function handleSave() {
    if (!restaurantId) return

    if (mode === 'whatsapp' && !whatsappNum.trim()) {
      toast.error(language === 'ar' ? 'يرجى إرفاق رقم واتساب لاستقبال الطلبات عليه.' : 'Add a WhatsApp number to receive orders.')
      return
    }

    setIsLoading(true)
    try {
      await updateSettings(restaurantId, {
        ordering_mode: mode,
        whatsapp_number: mode === 'whatsapp' && whatsappNum ? whatsappNum : null,
      })
      toast.success(language === 'ar' ? 'تم حفظ الإعدادات بنجاح.' : 'Settings saved successfully.')
    } catch {
      toast.error(language === 'ar' ? 'تعذر حفظ الإعدادات.' : 'Unable to save settings.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <ContentSection title={language === 'ar' ? 'إعدادات استلام الطلبات' : 'Order intake settings'} desc=''>
        <div className='flex h-40 items-center justify-center text-muted-foreground'>
          {language === 'ar' ? 'جارٍ التحميل...' : 'Loading…'}
        </div>
      </ContentSection>
    )
  }

  return (
    <ContentSection
      title={language === 'ar' ? 'إعدادات استلام الطلبات' : 'Order intake settings'}
      desc={language === 'ar' ? 'اختر طريقة استقبال طلبات الزبائن من منيو المطعم.' : 'Choose how customer orders are received from your restaurant menu.'}
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className='space-y-6'>
        <div className='space-y-4'>
          <Label htmlFor='ordering_mode'>{language === 'ar' ? 'استقبال الطلبات عبر' : 'Receive orders through'}</Label>
          <RadioGroup
            onValueChange={(val) => setMode(val as 'system' | 'whatsapp')}
            value={mode}
            className='gap-4'
          >
            <div className='flex items-center space-x-2'>
              <RadioGroupItem id='system' value='system' />
              <Label htmlFor='system'>{language === 'ar' ? 'نظام الإدارة' : 'Admin system'}</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem id='whatsapp' value='whatsapp' />
              <Label htmlFor='whatsapp'>WhatsApp</Label>
            </div>
          </RadioGroup>
        </div>

        {mode === 'whatsapp' && (
          <div className='mt-4 space-y-2'>
            <Label htmlFor='whatsappNumber'>{language === 'ar' ? 'رقم الواتساب (إجباري)' : 'WhatsApp number (required)'}</Label>
            <Input
              id='whatsappNumber'
              type='tel'
              placeholder={language === 'ar' ? 'أدخل رقم الهاتف...' : 'Enter phone number…'}
              value={whatsappNum}
              onChange={(e) => setWhatsappNum(e.target.value)}
              required
            />
            <p className='text-xs text-muted-foreground'>
              {language === 'ar' ? 'يُستخدم هذا الرقم لتوجيه طلبات الزبائن عبر واتساب.' : 'This number is used to route customer orders through WhatsApp.'}
            </p>
          </div>
        )}

        <Button type='submit' disabled={isLoading} className='w-full'>
          {isLoading ? language === 'ar' ? 'جارٍ الحفظ...' : 'Saving…' : language === 'ar' ? 'حفظ الإعدادات' : 'Save settings'}
        </Button>
      </form>
    </ContentSection>
  )
}
