import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

export interface RestaurantTable {
  id: string
  restaurant_id: string
  label: string
  qr_token: string
  created_at: string
}

export function useRestaurantTables() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useQuery({
    queryKey: ['restaurant-tables', restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<RestaurantTable[]> => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useCreateTable() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (label: string) => {
      if (!restaurantId) throw new Error('لا يوجد مطعم مرتبط بالحساب الحالي.')
      const { error } = await supabase
        .from('restaurant_tables')
        .insert({ restaurant_id: restaurantId, label })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables', restaurantId] })
    },
  })
}

export function useDeleteTable() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('restaurant_tables').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables', restaurantId] })
    },
  })
}
