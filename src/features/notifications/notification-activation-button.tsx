import { BellRing } from 'lucide-react'
import { toast } from 'sonner'
import { useNotificationStore } from '@/stores/notification-store'
import { Button } from '@/components/ui/button'
import { getNotificationSoundUrl } from './sound'

export function NotificationActivationButton() {
  const soundEnabled = useNotificationStore((state) => state.soundEnabled)
  const audioUnlocked = useNotificationStore((state) => state.audioUnlocked)
  const notificationSoundUrl = useNotificationStore(
    (state) => state.notificationSoundUrl
  )
  const setSoundEnabled = useNotificationStore((state) => state.setSoundEnabled)
  const setAudioUnlocked = useNotificationStore(
    (state) => state.setAudioUnlocked
  )

  if (audioUnlocked && soundEnabled) return null

  async function activate() {
    const audio = new Audio(getNotificationSoundUrl(notificationSoundUrl))
    audio.preload = 'auto'
    audio.volume = 0
    try {
      await audio.play()
      audio.pause()
      audio.currentTime = 0
      audio.volume = 1
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
      variant='secondary'
      onClick={() => void activate()}
    >
      <BellRing className='size-4' /> تفعيل الإشعارات الصوتية
    </Button>
  )
}
