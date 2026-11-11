import { useEffect, useState } from 'react'
import { BellRing, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { useNotificationStore } from '@/stores/notification-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getNotificationSoundUrl,
  uploadNotificationSound,
} from '@/features/notifications/sound'
import { useRestaurantSettingsApi } from '@/features/orders/restaurant-settings-api'
import { ContentSection } from './components/content-section'

export function NotificationSettings() {
  const restaurantId = useAuthStore((state) => state.restaurant?.id)
  const { fetchSettings, updateSettings } = useRestaurantSettingsApi()
  const notificationSoundUrl = useNotificationStore(
    (state) => state.notificationSoundUrl
  )
  const setNotificationSoundUrl = useNotificationStore(
    (state) => state.setNotificationSoundUrl
  )
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!restaurantId) return
    let active = true
    void fetchSettings(restaurantId)
      .then((settings) => {
        if (active)
          setNotificationSoundUrl(settings?.notification_sound_url ?? null)
      })
      .catch(() => toast.error('تعذر تحميل إعدادات الإشعارات.'))
    return () => {
      active = false
    }
  }, [fetchSettings, restaurantId, setNotificationSoundUrl])

  async function onFileSelected(file: File | undefined) {
    if (!file || !restaurantId) return
    setUploading(true)
    try {
      const url = await uploadNotificationSound(restaurantId, file)
      await updateSettings(restaurantId, { notification_sound_url: url })
      setNotificationSoundUrl(url)
      toast.success('تم حفظ صوت الإشعار المخصص.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر رفع الملف الصوتي.'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <ContentSection
      title='إعدادات الإشعارات'
      desc='خصص صوت الطلبات الجديدة للكاشير. يُستخدم الصوت الافتراضي عند عدم رفع ملف.'
    >
      <div className='space-y-4'>
        <div className='rounded-lg border bg-muted/30 p-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-2'>
              <BellRing className='size-5 text-primary' />
              <div>
                <p className='font-medium'>صوت الطلبات الجديدة</p>
                <p className='text-xs text-muted-foreground'>
                  {notificationSoundUrl
                    ? 'يتم استخدام الصوت المخصص.'
                    : 'يتم استخدام الصوت الافتراضي.'}
                </p>
              </div>
            </div>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                const audio = new Audio(
                  getNotificationSoundUrl(notificationSoundUrl)
                )
                void audio
                  .play()
                  .catch(() => toast.error('فعّل الصوت من زر Header أولًا.'))
              }}
            >
              معاينة الصوت
            </Button>
          </div>
          <audio
            className='mt-4 w-full'
            controls
            src={getNotificationSoundUrl(notificationSoundUrl)}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='notification-sound'>رفع ملف صوتي MP3 أو WAV</Label>
          <Input
            id='notification-sound'
            type='file'
            accept='audio/mpeg,audio/wav,.mp3,.wav'
            disabled={uploading || !restaurantId}
            onChange={(event) => void onFileSelected(event.target.files?.[0])}
          />
          <p className='text-xs text-muted-foreground'>
            الحد الأقصى 5 ميغابايت. سيطبق الصوت الجديد فور الحفظ.
          </p>
        </div>
        {uploading && (
          <Button disabled>
            <Upload className='size-4 animate-pulse' /> جارٍ رفع الصوت...
          </Button>
        )}
      </div>
    </ContentSection>
  )
}
