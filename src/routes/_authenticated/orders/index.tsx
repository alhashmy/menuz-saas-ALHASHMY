import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useQueryClient } from '@tanstack/react-query'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useOrders } from '@/features/orders/api'
import { OrderDetailsSheet } from '@/features/orders/components/OrderDetailsSheet'
import { RefreshCw, Eye } from 'lucide-react'
import { useState } from 'react'

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  preparing: 'يتم التحضير',
  ready: 'جاهز',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'secondary',
  preparing: 'outline',
  ready: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
}

const FILTER_TABS = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغي' },
]

export function OrdersPage() {
  const { restaurant } = useAuthStore()
  const restaurantId = restaurant?.id ?? null
  const queryClient = useQueryClient()
  const { data: orders = [], isLoading } = useOrders(restaurantId)
  const [detailsOpenId, setDetailsOpenId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] })
    queryClient.invalidateQueries({ queryKey: ['order-stats', restaurantId] })
  }

  const filteredOrders =
    filterStatus === 'all'
      ? orders
      : orders.filter((order) => order.status === filterStatus)

  if (isLoading) {
    return (
      <div className='flex h-40 items-center justify-center text-muted-foreground'>
        <RefreshCw className='me-2 size-5 animate-spin' />
        جارٍ جلب الطلبات...
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>الطلبات</h1>
          <p className='text-muted-foreground text-sm'>
            متابعة جميع طلبات الزبائن الواردة من المنيو الرقمي.
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={handleRefresh}
        >
          <RefreshCw className='mr-2 size-4' />
          تحديث
        </Button>
      </div>

      <Tabs
        defaultValue='all'
        value={filterStatus}
        onValueChange={(value) => setFilterStatus(value)}
        className='w-full max-w-md'
      >
        <TabsList className='grid w-full grid-cols-4'>
          {FILTER_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-14'>#</TableHead>
              <TableHead>اسم الزبون</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead className='text-right'>المبلغ الإجمالي</TableHead>
              <TableHead>الوجبات</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className='text-right'>التاريخ</TableHead>
              <TableHead className='text-center w-20'>إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='h-24 text-center text-muted-foreground'>
                  لا توجد طلبات حسب هذا التصفية.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className='font-mono text-sm text-muted-foreground'>
                    #{order.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className='font-medium'>{order.customer_name}</TableCell>
                  <TableCell className='font-mono text-sm'>{order.customer_phone}</TableCell>
                  <TableCell className='text-right font-medium'>
                    {order.total_amount != null
                      ? order.total_amount.toLocaleString('ar-IQ')
                      : '0'} د.ع
                  </TableCell>
                  <TableCell className='text-sm text-muted-foreground'>
                    {(order.items ?? []).map((item) => (
                      <div key={item.menu_item_id} className='mb-1'>
                        {item.name} × {item.quantity}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[order.status]}>
                      {STATUS_LABELS[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right text-sm text-muted-foreground'>
                    {order.created_at
                      ? new Date(order.created_at).toLocaleString('ar-IQ', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'تاريخ غير متوفر'}
                  </TableCell>
                  <TableCell className='text-center'>
                    <div className='flex items-center justify-center gap-1.5'>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-8 w-8 p-0'
                        onClick={() => setDetailsOpenId(order.id)}
                      >
                        <Eye className='size-4' />
                      </Button>
                    </div>
                    <OrderDetailsSheet
                      open={detailsOpenId === order.id}
                      onOpenChange={(open) => {
                        if (!open) setDetailsOpenId(null)
                      }}
                      order={order}
                      restaurantName={restaurant?.name}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableCaption>
            إجمالي الطلبات: {filteredOrders.length}
          </TableCaption>
        </Table>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/orders/')({
  component: OrdersPage,
})
