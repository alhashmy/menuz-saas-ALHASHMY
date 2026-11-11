import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface RestaurantSettings {
  id: string
  name: string
  slug: string
  ordering_mode: 'system' | 'whatsapp'
  whatsapp_number: string | null
  notification_sound_url: string | null
  google_maps_url: string | null
  website_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
}

export const restaurantSettingsQueryKey = (restaurantId: string) =>
  ['restaurant-settings', restaurantId] as const

export function useRestaurantSettingsApi() {
  const fetchSettings = useCallback(
    async (restaurantId: string): Promise<RestaurantSettings | null> => {
      const { data, error } = await supabase
        .from('restaurants')
        // `*` keeps the essential slug fetch working during rolling deployments
        // where optional social columns have not reached every environment yet.
        .select('*')
        .eq('id', restaurantId)
        .maybeSingle()

      if (error) throw error
      return data
        ? {
            id: data.id,
            name: data.name,
            slug: data.slug,
            ordering_mode: data.ordering_mode as 'system' | 'whatsapp',
            whatsapp_number: data.whatsapp_number,
            notification_sound_url: data.notification_sound_url,
            google_maps_url: data.google_maps_url,
            website_url: data.website_url,
            instagram_url: data.instagram_url,
            facebook_url: data.facebook_url,
            tiktok_url: data.tiktok_url,
          }
        : null
    },
    []
  )

  const updateSettings = useCallback(
    async (
      restaurantId: string,
      input: {
        name?: string
        slug?: string
        ordering_mode?: 'system' | 'whatsapp'
        whatsapp_number?: string | null
        notification_sound_url?: string | null
        google_maps_url?: string | null
        website_url?: string | null
        instagram_url?: string | null
        facebook_url?: string | null
        tiktok_url?: string | null
      }
    ): Promise<RestaurantSettings> => {
      const { data, error } = await supabase
        .from('restaurants')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantId)
        .select('*')
        .single()

      if (error) throw error
      return data as RestaurantSettings
    },
    []
  )

  return { fetchSettings, updateSettings }
}
