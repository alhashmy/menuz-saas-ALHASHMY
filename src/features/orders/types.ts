export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export interface OrderItem {
  menu_item_id: string
  name: string
  price: number
  quantity: number
  total: number
}

export interface Order {
  id: string
  restaurant_id: string
  customer_name: string
  customer_phone: string
  customer_address: string | null
  items: OrderItem[]
  discount_code: string | null
  discount_amount: number
  total_amount: number
  status: OrderStatus
  daily_sequence: number
  is_archived: boolean
  delivery_zone_id: string | null
  delivery_fee: number
  created_at: string
}

export interface OrderStats {
  totalOrders: number
  totalRevenue: number
  totalItems: number
  ordersByStatus: Record<OrderStatus, number>
  monthlyRevenue: { month: string; revenue: number }[]
}

export interface CreateOrderInput {
  restaurant_id: string
  customer_name: string
  customer_phone: string
  customer_address: string | null
  items: OrderItem[]
  discount_code: string | null
  discount_amount: number
  total: number
}
