import { supabase } from '@/lib/supabase'

export interface RestaurantSettings {
  id: string
  name: string
  ordering_mode: 'system' | 'whatsapp'
  whatsapp_number: string | null
}

export function useRestaurantSettingsApi() {
  async function fetchSettings(restaurantId: string): Promise<RestaurantSettings | null> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, ordering_mode, whatsapp_number')
      .eq('id', restaurantId)
      .maybeSingle()

    if (error) throw error
    return data
      ? {
          id: data.id,
          name: data.name,
          ordering_mode: data.ordering_mode as 'system' | 'whatsapp',
          whatsapp_number: data.whatsapp_number,
        }
      : null
  }

  async function updateSettings(
    restaurantId: string,
    input: { ordering_mode?: 'system' | 'whatsapp'; whatsapp_number?: string | null }
  ): Promise<void> {
    const { error } = await supabase
      .from('restaurants')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurantId)

    if (error) throw error
  }

  return { fetchSettings, updateSettings }
}
