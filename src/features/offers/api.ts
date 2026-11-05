import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Offer } from './types'

export function useOffers() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useQuery({
    queryKey: ['offers', restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<Offer[]> => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export interface UpsertOfferInput {
  id?: string
  title: string
  title_ar?: string
  scope: 'item' | 'order'
  discount_kind: 'percentage' | 'fixed'
  discount_value: number
  item_id?: string | null
  promo_code?: string | null
}

export function useUpsertOffer() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (input: UpsertOfferInput) => {
      if (!restaurantId) throw new Error('لا يوجد مطعم مرتبط بالحساب الحالي.')
      const { id, ...rest } = input

      const payload = {
        ...rest,
        item_id: rest.scope === 'item' ? rest.item_id ?? null : null,
        promo_code:
          rest.scope === 'order' ? (rest.promo_code ?? '').toUpperCase() : null,
      }

      if (id) {
        const { error } = await supabase.from('offers').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('offers')
          .insert({ ...payload, restaurant_id: restaurantId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', restaurantId] })
    },
  })
}

export function useToggleOfferActive() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: input.is_active })
        .eq('id', input.id)
      if (error) throw error
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['offers', restaurantId] })
      const previous = queryClient.getQueryData<Offer[]>(['offers', restaurantId])
      queryClient.setQueryData<Offer[]>(['offers', restaurantId], (old) =>
        old?.map((offer) =>
          offer.id === input.id ? { ...offer, is_active: input.is_active } : offer
        )
      )
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['offers', restaurantId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', restaurantId] })
    },
  })
}

export function useDeleteOffer() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('offers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', restaurantId] })
    },
  })
}
