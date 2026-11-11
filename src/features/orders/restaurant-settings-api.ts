import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface RestaurantSettings {
  id: string
  name: string
  slug: string
  ordering_mode: 'system' | 'whatsapp'
  whatsapp_number: string | null
}

export function useRestaurantSettingsApi() {
  const fetchSettings = useCallback(
    async (restaurantId: string): Promise<RestaurantSettings | null> => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, slug, ordering_mode, whatsapp_number')
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
      }
    ): Promise<void> => {
      const { error } = await supabase
        .from('restaurants')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantId)

      if (error) throw error
    },
    []
  )

  return { fetchSettings, updateSettings }
}
