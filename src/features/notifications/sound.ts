import { supabase } from '@/lib/supabase'

const ACCEPTED_AUDIO_TYPES = new Set(['audio/mpeg', 'audio/wav', 'audio/x-wav'])
const MAX_AUDIO_BYTES = 5 * 1024 * 1024

export function getNotificationSoundUrl(soundUrl: string | null | undefined) {
  return soundUrl?.startsWith('https://') || soundUrl?.startsWith('http://')
    ? soundUrl
    : '/notification.mp3'
}

export async function uploadNotificationSound(
  restaurantId: string,
  file: File
) {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  if (
    !ACCEPTED_AUDIO_TYPES.has(file.type) ||
    !['mp3', 'wav'].includes(fileExtension ?? '')
  ) {
    throw new Error('ارفع ملف MP3 أو WAV فقط.')
  }
  if (file.size > MAX_AUDIO_BYTES)
    throw new Error('الحد الأقصى لحجم الملف هو 5 ميغابايت.')

  const path = `${restaurantId}/notifications/order-${Date.now()}.${fileExtension}`
  const { error } = await supabase.storage.from('settings').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  return supabase.storage.from('settings').getPublicUrl(path).data.publicUrl
}
