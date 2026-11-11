import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { useNotificationStore } from '@/stores/notification-store'
import { supabase } from '@/lib/supabase'
import {
  playNotificationAudio,
  preloadNotificationAudio,
  unlockNotificationAudio,
} from './notification-audio'

type NewOrderPayload = {
  restaurant_id?: unknown
  customer_name?: unknown
  daily_sequence?: unknown
}

export function OrderNotificationListener() {
  const restaurantId = useAuthStore((state) => state.restaurant?.id)
  const queryClient = useQueryClient()
  const soundEnabled = useNotificationStore((state) => state.soundEnabled)
  const audioUnlocked = useNotificationStore((state) => state.audioUnlocked)
  const notificationSoundUrl = useNotificationStore(
    (state) => state.notificationSoundUrl
  )
  const setNotificationSoundUrl = useNotificationStore(
    (state) => state.setNotificationSoundUrl
  )

  useEffect(() => {
    if (!restaurantId) return
    let active = true
    void supabase
      .from('restaurants')
      .select('notification_sound_url')
      .eq('id', restaurantId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error) return
        setNotificationSoundUrl(data?.notification_sound_url ?? null)
      })
    return () => {
      active = false
    }
  }, [restaurantId, setNotificationSoundUrl])

  useEffect(() => {
    preloadNotificationAudio(notificationSoundUrl)
    if (!soundEnabled) return
    const unlockAudio = () => {
      void unlockNotificationAudio(notificationSoundUrl)
        .then(() => {
          useNotificationStore.getState().setAudioUnlocked(true)
        })
        .catch((error: unknown) => console.error('Could not unlock notification audio:', error))
    }

    // بعد التحديث لا يمكن للمتصفح ضمان تشغيل الصوت قبل أول لمسة، لذلك
    // نعيد تجهيزه بصمت فور أول تفاعل في أي مكان من التطبيق.
    unlockAudio()
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
    }
  }, [notificationSoundUrl, soundEnabled])

  useEffect(() => {
    if (!restaurantId) return
    const channel = supabase
      .channel(`custom-insert-channel-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.pending',
        },
        (payload) => {
          const order = payload.new as NewOrderPayload
          if (order.restaurant_id !== restaurantId) return
          const customerName =
            typeof order.customer_name === 'string'
              ? order.customer_name
              : 'زبون جديد'
          const sequence =
            typeof order.daily_sequence === 'number'
              ? order.daily_sequence
              : '—'

          if (soundEnabled) {
            // Kept directly in the INSERT callback: no delayed state transition can
            // swallow playback after a new order arrives.
            void playNotificationAudio(notificationSoundUrl)
              .then(() => {
              if (!audioUnlocked) useNotificationStore.getState().setAudioUnlocked(true)
              })
              .catch((error: unknown) => console.error('Could not play notification audio:', error))
          }
          if (
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification('🚨 لديك طلب جديد!', {
              body: `${customerName} — رقم الطلب ${sequence}`,
              icon: '/images/favicon.png',
              tag: `order-${sequence}`,
            })
          }
          toast.success(
            `🚨 لديك طلب جديد! — طلب رقم #${sequence} من ${customerName}`,
            {
              duration: 10_000,
            }
          )
          void queryClient.invalidateQueries({
            queryKey: ['orders', restaurantId],
          })
          void queryClient.invalidateQueries({
            queryKey: ['order-stats', restaurantId],
          })
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [audioUnlocked, notificationSoundUrl, queryClient, restaurantId, soundEnabled])

  return null
}
