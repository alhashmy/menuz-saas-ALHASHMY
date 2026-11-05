import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { MenuCategory, MenuItem } from './types'

// ----------------------------- الأقسام -----------------------------

export function useMenuCategories() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useQuery({
    queryKey: ['menu-categories', restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<MenuCategory[]> => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (input: { name: string; name_ar?: string }) => {
      if (!restaurantId) throw new Error('لا يوجد مطعم مرتبط بالحساب الحالي.')
      const { error } = await supabase.from('menu_categories').insert({
        restaurant_id: restaurantId,
        name: input.name,
        name_ar: input.name_ar ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', restaurantId] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (input: Partial<MenuCategory> & { id: string }) => {
      const { id, ...rest } = input
      const { error } = await supabase.from('menu_categories').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', restaurantId] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories', restaurantId] })
      queryClient.invalidateQueries({ queryKey: ['menu-items', restaurantId] })
    },
  })
}

// ----------------------------- الوجبات -----------------------------

export function useMenuItems() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useQuery({
    queryKey: ['menu-items', restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<MenuItem[]> => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

export interface UpsertMenuItemInput {
  id?: string
  category_id: string
  name: string
  name_ar?: string
  description?: string
  description_ar?: string
  price: number
  image_path?: string | null
}

export function useUpsertMenuItem() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (input: UpsertMenuItemInput) => {
      if (!restaurantId) throw new Error('لا يوجد مطعم مرتبط بالحساب الحالي.')
      const { id, ...rest } = input

      if (id) {
        const { error } = await supabase.from('menu_items').update(rest).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert({ ...rest, restaurant_id: restaurantId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', restaurantId] })
    },
  })
}

export function useToggleItemAvailability() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (input: { id: string; is_available: boolean }) => {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: input.is_available })
        .eq('id', input.id)
      if (error) throw error
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['menu-items', restaurantId] })
      const previous = queryClient.getQueryData<MenuItem[]>(['menu-items', restaurantId])
      queryClient.setQueryData<MenuItem[]>(['menu-items', restaurantId], (old) =>
        old?.map((item) =>
          item.id === input.id ? { ...item, is_available: input.is_available } : item
        )
      )
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['menu-items', restaurantId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', restaurantId] })
    },
  })
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items', restaurantId] })
    },
  })
}
