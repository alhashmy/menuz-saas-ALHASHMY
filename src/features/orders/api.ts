import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Order, OrderStats, CreateOrderInput, OrderStatus } from './types'

export function useOrders(restaurantId: string | null) {
  return useQuery({
    queryKey: ['orders', restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((row) => ({
        id: row.id,
        restaurant_id: row.restaurant_id,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        customer_address: row.customer_address,
        items: row.items,
        discount_code: row.discount_code,
        discount_amount: row.discount_amount,
        total_amount: row.total_amount,
        status: row.status,
        created_at: row.created_at,
      }))
    },
  })
}

export function useOrderStats(restaurantId: string | null) {
  return useQuery({
    queryKey: ['order-stats', restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<OrderStats> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId!)
      if (error) throw error
      const orders = (data ?? []) as Order[]

      const totalOrders = orders.length
      const totalRevenue = orders.reduce(
        (sum, o) => sum + (Number(o.total_amount) || 0),
        0
      )
      const totalItems = orders.reduce(
        (sum, o) => sum + (o.items ?? []).reduce((s, i) => s + (Number(i.quantity) || 0), 0),
        0
      )

      const ordersByStatus: Record<OrderStatus, number> = {
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        completed: 0,
        cancelled: 0,
      }
      for (const o of orders) {
        ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1
      }

      const now = new Date()
      const monthlyRevenue: { month: string; revenue: number }[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = d.toISOString().slice(0, 7)
        const monthOrders = orders.filter((o) => o.created_at.slice(0, 7) === monthKey)
        const revenue = monthOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
        monthlyRevenue.push({ month: d.toLocaleString('ar-SA', { month: 'short' }), revenue })
      }

      return { totalOrders, totalRevenue, totalItems, ordersByStatus, monthlyRevenue }
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      if (restaurantId) {
        queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] })
        queryClient.invalidateQueries({ queryKey: ['order-stats', restaurantId] })
      }
    },
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (input: Omit<CreateOrderInput, 'restaurant_id'>) => {
      if (!restaurantId) throw new Error('لا يوجد مطعم مرتبط بالحساب الحالي.')
      const { data, error } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          customer_address: input.customer_address,
          items: input.items,
          discount_code: input.discount_code,
          discount_amount: input.discount_amount,
          total_amount: input.total,
          status: 'pending',
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      if (restaurantId) {
        queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] })
        queryClient.invalidateQueries({ queryKey: ['order-stats', restaurantId] })
      }
    },
  })
}
