import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Order } from '@/features/orders/types'

interface RecentSalesProps {
  orders: Order[]
}

export function RecentSales({ orders }: RecentSalesProps) {
  if (orders.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-muted-foreground'>
        <p>لا توجد طلبات بعد.</p>
      </div>
    )
  }

  const recentOrders = orders.slice(0, 5)

  return (
    <div className='space-y-4'>
      {recentOrders.map((order) => (
        <div key={order.id} className='flex items-center gap-4'>
          <Avatar className='h-9 w-9'>
            <AvatarImage src='/avatars/01.png' alt='Avatar' />
            <AvatarFallback>OM</AvatarFallback>
          </Avatar>
          <div className='flex flex-1 flex-wrap items-center justify-between'>
            <div className='space-y-1'>
              <p className='text-sm leading-none font-medium'>
                {order.customer_name}
              </p>
              <p className='text-sm text-muted-foreground'>
                {order.customer_phone}
              </p>
            </div>
            <div className='flex flex-col items-end'>
              <div className='font-medium' dir='ltr'>
                د.ع {order.total.toFixed(2)}
              </div>
              <Badge
                variant={
                  order.status === 'completed'
                    ? 'default'
                    : order.status === 'cancelled'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {order.status}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
