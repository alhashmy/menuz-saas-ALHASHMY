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
        if (!active) return
        if (error) {
          console.error('[Realtime] Failed to fetch notification sound URL', {
            restaurantId,
            error: error.message,
            timestamp: new Date().toISOString(),
          })
          return
        }
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
      void unlockNotificationAudio(notificationSoundUrl).then(() => {
        useNotificationStore.getState().setAudioUnlocked(true)
      })
    }

    // Attach one-time global listeners for first user gesture to unlock audio
    window.addEventListener('click', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })
    return () => {
      window.removeEventListener('click', unlockAudio)
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
            // Debug: log sound URL status before attempting playback
            console.log(
              'New order received. Attempting to play sound. URL exists?:',
              !!notificationSoundUrl,
              'URL:',
              notificationSoundUrl
            )
            // Play directly in INSERT callback; catch prevents app crash if autoplay blocked
            void playNotificationAudio(notificationSoundUrl).catch((error: unknown) => {
              console.warn('Audio playback prevented (autoplay policy):', error)
            })
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
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          console.info('[Realtime] orders listener subscribed', { restaurantId })
          toast.dismiss() // Dismiss any pending error toast on successful subscription
          return
        }
        // Only treat CHANNEL_ERROR and TIMED_OUT as real errors
        // CLOSED is expected during cleanup/unmount and should not show error toast
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Realtime] orders listener failed', {
            restaurantId,
            status,
            error: error?.message ?? error,
            supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
            hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
            timestamp: new Date().toISOString(),
          })
          toast.error('تعذر ربط التنبيهات الفورية. أعد تحميل الصفحة أو راجع إعدادات الإنتاج.')
        }
      })
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [notificationSoundUrl, queryClient, restaurantId, soundEnabled])

  return null
}
