import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  fetchOrdersForDateRange,
  useOrderStats,
  useOrders,
} from '@/features/orders/api'
import { Analytics } from './components/analytics'
import { Overview } from './components/overview'
import { RecentSales } from './components/recent-sales'
import { exportOrdersPdf } from './pdf-report'

function baghdadDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad' }).format(
    new Date()
  )
}

export function Dashboard() {
  const { restaurant } = useAuthStore()
  const restaurantId = restaurant?.id ?? null
  const { data: orders = [] } = useOrders(restaurantId)
  const { data: stats } = useOrderStats(restaurantId)
  const [exporting, setExporting] = useState(false)
  const [rangeOpen, setRangeOpen] = useState(false)
  const today = baghdadDate()
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)

  const totalRevenue = stats?.totalRevenue ?? 0
  const totalOrders = stats?.totalOrders ?? 0
  const totalItems = stats?.totalItems ?? 0
  const pendingOrders = stats?.ordersByStatus.pending ?? 0
  const monthlyRevenue = stats?.monthlyRevenue ?? []

  async function exportReport(start: string, end: string) {
    if (!restaurantId || !restaurant) return
    if (start > end) {
      toast.error('تاريخ البداية يجب أن يسبق تاريخ النهاية.')
      return
    }
    setExporting(true)
    try {
      const reportOrders = await fetchOrdersForDateRange(
        restaurantId,
        start,
        end
      )
      await exportOrdersPdf({
        restaurantName: restaurant.name,
        orders: reportOrders,
        label: start === end ? `طلبات يوم ${start}` : `من ${start} إلى ${end}`,
        filename: `orders-${start}-${end}.pdf`,
      })
      toast.success('تم إنشاء تقرير PDF.')
      setRangeOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'تعذر إنشاء التقرير.'
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main dir='rtl'>
        <div className='mb-5 flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>نظرة عامة</h1>
            <p className='mt-1 text-sm text-muted-foreground'>
              ملخص أداء المطعم والطلبات الواردة.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              onClick={() => void exportReport(today, today)}
              disabled={exporting || !restaurantId}
            >
              {exporting ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <FileDown className='size-4' />
              )}{' '}
              تصدير طلبات اليوم PDF
            </Button>
            <Button
              variant='outline'
              onClick={() => setRangeOpen(true)}
              disabled={exporting || !restaurantId}
            >
              <FileDown className='size-4' /> تصدير فترة مخصصة
            </Button>
          </div>
        </div>
        <Tabs defaultValue='overview' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='overview'>نظرة عامة</TabsTrigger>
            <TabsTrigger value='analytics'>التحليلات</TabsTrigger>
          </TabsList>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <MetricCard
                title='إجمالي المبيعات'
                value={`${totalRevenue.toLocaleString('ar-IQ')} د.ع`}
                detail={`${totalOrders} طلب إجمالي`}
              />
              <MetricCard
                title='إجمالي الطلبات'
                value={totalOrders.toLocaleString('ar-IQ')}
                detail='كل الطلبات المسجلة'
              />
              <MetricCard
                title='الأصناف المباعة'
                value={totalItems.toLocaleString('ar-IQ')}
                detail='إجمالي القطع المباعة'
              />
              <MetricCard
                title='طلبات قيد الانتظار'
                value={pendingOrders.toLocaleString('ar-IQ')}
                detail='تحتاج إلى متابعة'
              />
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='lg:col-span-4'>
                <CardHeader>
                  <CardTitle>المبيعات الشهرية</CardTitle>
                </CardHeader>
                <CardContent className='ps-2'>
                  <Overview monthlyRevenue={monthlyRevenue} />
                </CardContent>
              </Card>
              <Card className='lg:col-span-3'>
                <CardHeader>
                  <CardTitle>أحدث الطلبات</CardTitle>
                  <CardDescription>آخر الطلبات غير المؤرشفة.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales orders={orders} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value='analytics'>
            <Analytics stats={stats} />
          </TabsContent>
        </Tabs>
      </Main>
      <Dialog open={rangeOpen} onOpenChange={setRangeOpen}>
        <DialogContent dir='rtl'>
          <DialogHeader>
            <DialogTitle>تصدير تقرير مخصص</DialogTitle>
            <DialogDescription>
              اختر الفترة التي تريد تضمينها في تقرير المبيعات والطلبات.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='report-start'>من تاريخ</Label>
              <Input
                id='report-start'
                type='date'
                value={startDate}
                max={endDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='report-end'>إلى تاريخ</Label>
              <Input
                id='report-end'
                type='date'
                value={endDate}
                min={startDate}
                max={today}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setRangeOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => void exportReport(startDate, endDate)}
              disabled={exporting}
            >
              {exporting ? 'جارٍ التصدير...' : 'تصدير PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MetricCard({
  title,
  value,
  detail,
}: {
  title: string
  value: string
  detail: string
}) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        <p className='mt-1 text-xs text-muted-foreground'>{detail}</p>
      </CardContent>
    </Card>
  )
}
