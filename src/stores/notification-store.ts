import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type NotificationState = {
  soundEnabled: boolean
  audioUnlocked: boolean
  hasHydrated: boolean
  notificationSoundUrl: string | null
  setSoundEnabled: (enabled: boolean) => void
  setAudioUnlocked: (unlocked: boolean) => void
  setNotificationSoundUrl: (url: string | null) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      soundEnabled: false,
      audioUnlocked: false,
      hasHydrated: false,
      notificationSoundUrl: null,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setAudioUnlocked: (audioUnlocked) => set({ audioUnlocked }),
      setNotificationSoundUrl: (notificationSoundUrl) =>
        set({ notificationSoundUrl }),
    }),
    {
      name: 'menuz-order-notifications',
      partialize: (state) => ({ soundEnabled: state.soundEnabled }),
      onRehydrateStorage: () => () => {
        useNotificationStore.setState({ hasHydrated: true })
      },
    }
  )
)
