import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase'
import type { Order, OrderStats, CreateOrderInput, OrderStatus } from './types'

function toOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    restaurant_id: row.restaurant_id as string,
    customer_name: row.customer_name as string,
    customer_phone: row.customer_phone as string,
    customer_address: row.customer_address as string | null,
    items: row.items as Order['items'],
    discount_code: row.discount_code as string | null,
    discount_amount: row.discount_amount as number,
    discount_kind: row.discount_kind as Order['discount_kind'],
    discount_value: row.discount_value as number | null,
    discount_description: row.discount_description as string | null,
    total_amount: row.total_amount as number,
    status: row.status as OrderStatus,
    daily_sequence: row.daily_sequence as number,
    is_archived: row.is_archived as boolean,
    delivery_zone_id: row.delivery_zone_id as string | null,
    delivery_fee: row.delivery_fee as number,
    cancellation_reason: row.cancellation_reason as string | null,
    created_at: row.created_at as string,
  }
}

export function getBaghdadDateRange(startDate: string, endDate: string) {
  const start = `${startDate}T00:00:00+03:00`
  const end = new Date(`${endDate}T00:00:00+03:00`)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end: end.toISOString() }
}

export async function fetchOrdersForDateRange(
  restaurantId: string,
  startDate: string,
  endDate: string
) {
  const { start, end } = getBaghdadDateRange(startDate, endDate)
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => toOrder(row as Record<string, unknown>))
}

export function useOrders(restaurantId: string | null) {
  return useQuery({
    queryKey: ['orders', restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((row) => toOrder(row as Record<string, unknown>))
    },
  })
}

export function useArchiveResolvedOrders() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('لا يوجد مطعم مرتبط بالحساب الحالي.')
      const { error } = await supabase.rpc('archive_resolved_orders', {
        p_restaurant_id: restaurantId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      if (restaurantId) {
        queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] })
        queryClient.invalidateQueries({ queryKey: ['archived-orders', restaurantId] })
        queryClient.invalidateQueries({
          queryKey: ['order-stats', restaurantId],
        })
      }
    },
  })
}

export function useArchivedOrders(restaurantId: string | null, date?: string) {
  return useQuery({
    queryKey: ['archived-orders', restaurantId, date ?? 'all'],
    enabled: !!restaurantId,
    queryFn: async (): Promise<Order[]> => {
      let query = supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .eq('is_archived', true)
      if (date) {
        const range = getBaghdadDateRange(date, date)
        query = query.gte('created_at', range.start).lt('created_at', range.end)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((row) => toOrder(row as Record<string, unknown>))
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!restaurantId) throw new Error('لا يوجد مطعم مرتبط بالحساب الحالي.')
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId)
      if (error) throw error
    },
    onSuccess: () => {
      if (restaurantId) {
        queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] })
        queryClient.invalidateQueries({
          queryKey: ['order-stats', restaurantId],
        })
      }
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
        (sum, o) =>
          sum +
          (o.items ?? []).reduce((s, i) => s + (Number(i.quantity) || 0), 0),
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
        const monthOrders = orders.filter(
          (o) => o.created_at.slice(0, 7) === monthKey
        )
        const revenue = monthOrders.reduce(
          (sum, o) => sum + Number(o.total_amount || 0),
          0
        )
        monthlyRevenue.push({
          month: d.toLocaleString('ar-SA', { month: 'short' }),
          revenue,
        })
      }

      return {
        totalOrders,
        totalRevenue,
        totalItems,
        ordersByStatus,
        monthlyRevenue,
      }
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async ({
      id,
      status,
      cancellationReason,
    }: {
      id: string
      status: OrderStatus
      cancellationReason?: string | null
    }) => {
      if (status === 'cancelled' && !cancellationReason?.trim()) {
        throw new Error('سبب الإلغاء مطلوب.')
      }
      const { data, error } = await supabase
        .from('orders')
        .update({
          status,
          cancellation_reason:
            status === 'cancelled' ? cancellationReason?.trim() : null,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      if (restaurantId) {
        queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] })
        queryClient.invalidateQueries({
          queryKey: ['order-stats', restaurantId],
        })
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
        queryClient.invalidateQueries({
          queryKey: ['order-stats', restaurantId],
        })
      }
    },
  })
}
