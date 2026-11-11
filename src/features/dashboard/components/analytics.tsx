import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { OrderStats } from '@/features/orders/types'
import { AnalyticsChart } from './analytics-chart'

interface AnalyticsProps {
  stats: OrderStats | undefined
}

export function Analytics({ stats }: AnalyticsProps) {
  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>نظرة على الأداء</CardTitle>
          <CardDescription>ملخص الطلبات والمبيعات المسجلة.</CardDescription>
        </CardHeader>
        <CardContent className='px-6'>
          <AnalyticsChart monthlyRevenue={stats?.monthlyRevenue ?? []} />
        </CardContent>
      </Card>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              إجمالي الطلبات
            </CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4 text-muted-foreground'
            >
              <path d='M3 3v18h18' />
              <path d='M7 15l4-4 4 4 4-6' />
            </svg>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats?.totalOrders ?? 0}</div>
            <p className='text-xs text-muted-foreground'>طلب إجمالي</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              إجمالي المبيعات
            </CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4 text-muted-foreground'
            >
              <circle cx='12' cy='7' r='4' />
              <path d='M6 21v-2a6 6 0 0 1 12 0v2' />
            </svg>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold' dir='ltr'>
              د.ع {stats?.totalRevenue?.toLocaleString('ar-IQ') ?? 0}
            </div>
            <p className='text-xs text-muted-foreground'>إجمالي الإيرادات</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              الأصناف المباعة
            </CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4 text-muted-foreground'
            >
              <path d='M3 12h6l3 6 3-6h6' />
            </svg>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats?.totalItems ?? 0}</div>
            <p className='text-xs text-muted-foreground'>أصناف مباعة</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>متوسط الطلب</CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4 text-muted-foreground'
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M12 6v6l4 2' />
            </svg>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold' dir='ltr'>
              د.ع{' '}
              {(
                (stats?.totalRevenue ?? 0) /
                Math.max(stats?.totalOrders ?? 1, 1)
              ).toFixed(2)}
            </div>
            <p className='text-xs text-muted-foreground'>متوسط قيمة الطلب</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
