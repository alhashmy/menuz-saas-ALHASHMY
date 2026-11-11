import { getNotificationSoundUrl } from './sound'

let audio: HTMLAudioElement | null = null
let loadedUrl: string | null = null

function getAudio(soundUrl: string | null | undefined) {
  const url = getNotificationSoundUrl(soundUrl)
  if (!audio || loadedUrl !== url) {
    audio?.pause()
    audio = new Audio(url)
    audio.preload = 'auto'
    audio.load()
    loadedUrl = url
  }
  return audio
}

/** Must be called from a user gesture to satisfy browser autoplay policies. */
export async function unlockNotificationAudio(soundUrl: string | null | undefined) {
  const player = getAudio(soundUrl)
  const previousVolume = player.volume
  player.muted = true
  player.volume = 0
  try {
    await player.play()
  } finally {
    player.pause()
    player.currentTime = 0
    player.muted = false
    player.volume = previousVolume || 1
  }
}

/** Invoked directly inside the Realtime INSERT callback. */
export function playNotificationAudio(soundUrl: string | null | undefined) {
  const player = getAudio(soundUrl)
  player.currentTime = 0
  return player.play()
}

export function preloadNotificationAudio(soundUrl: string | null | undefined) {
  void getAudio(soundUrl)
}
