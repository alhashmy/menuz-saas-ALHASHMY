import { BellRing } from 'lucide-react'
import { toast } from 'sonner'
import { useNotificationStore } from '@/stores/notification-store'
import { Button } from '@/components/ui/button'
import { unlockNotificationAudio } from './notification-audio'

export function NotificationActivationButton() {
  const soundEnabled = useNotificationStore((state) => state.soundEnabled)
  const notificationSoundUrl = useNotificationStore(
    (state) => state.notificationSoundUrl
  )
  const setSoundEnabled = useNotificationStore((state) => state.setSoundEnabled)
  const setAudioUnlocked = useNotificationStore(
    (state) => state.setAudioUnlocked
  )

  async function activate() {
    console.log('Bell clicked! Current sound URL is:', notificationSoundUrl)
    try {
      await unlockNotificationAudio(notificationSoundUrl)
      setSoundEnabled(true)
      setAudioUnlocked(true)
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      toast.success('تم تفعيل الإشعارات الصوتية.')
    } catch {
      toast.error('تعذر تفعيل الصوت. تحقق من إعدادات المتصفح.')
    }
  }

  return (
    <Button
      type='button'
      size='sm'
      variant={soundEnabled ? 'outline' : 'secondary'}
      onClick={() => void activate()}
      aria-label={soundEnabled ? 'الإشعارات مفعلة، اضغط لإعادة تجهيز الصوت' : 'تفعيل الإشعارات الصوتية'}
    >
      <BellRing className='size-4' /> {soundEnabled ? '🔔 الإشعارات مفعلة' : 'تفعيل الإشعارات الصوتية'}
    </Button>
  )
}
