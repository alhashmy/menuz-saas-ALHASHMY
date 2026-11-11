import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { useNotificationStore } from '@/stores/notification-store'
import { supabase } from '@/lib/supabase'
import { getNotificationSoundUrl } from './sound'

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
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
    audioRef.current = new Audio(getNotificationSoundUrl(notificationSoundUrl))
    audioRef.current.preload = 'auto'
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [notificationSoundUrl])

  useEffect(() => {
    if (!soundEnabled) return
    let active = true
    const unlockAudio = () => {
      const audio = audioRef.current
      if (!audio) return
      audio.volume = 0
      void audio
        .play()
        .then(() => {
          if (!active) return
          audio.pause()
          audio.currentTime = 0
          audio.volume = 1
          useNotificationStore.getState().setAudioUnlocked(true)
        })
        .catch(() => undefined)
    }

    // A direct muted attempt succeeds in browsers that permit restored media playback.
    unlockAudio()
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })
    return () => {
      active = false
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

          if (soundEnabled && audioUnlocked && audioRef.current) {
            audioRef.current.currentTime = 0
            void audioRef.current.play().catch(() => undefined)
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
  }, [audioUnlocked, queryClient, restaurantId, soundEnabled])

  return null
}
