import { useState } from 'react'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateOrderStatus } from '@/features/orders/api'
import type { Order } from '@/features/orders/types'

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  preparing: 'يتم التحضير',
  ready: 'جاهز',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

const STATUS_VARIANTS: Record<
  Order['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  confirmed: 'secondary',
  preparing: 'outline',
  ready: 'secondary',
  completed: 'default',
  cancelled: 'destructive',
}

interface OrderDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order
  restaurantName?: string
}

export function OrderDetailsSheet({
  open,
  onOpenChange,
  order,
  restaurantName,
}: OrderDetailsSheetProps) {
  const updateOrderStatus = useUpdateOrderStatus()
  const [dialogStatus, setDialogStatus] = useState(order.status)
  const [cancellationReason, setCancellationReason] = useState(
    order.cancellation_reason ?? ''
  )
  const [isUpdating, setIsUpdating] = useState(false)
  const dynamicRestaurantName = restaurantName || 'اسم المطعم'

  async function handleStatusChange() {
    if (dialogStatus === 'cancelled' && cancellationReason.trim().length < 2) {
      toast.error('يرجى كتابة سبب الإلغاء قبل حفظ الحالة.')
      return
    }
    setIsUpdating(true)
    try {
      await updateOrderStatus.mutateAsync({
        id: order.id,
        status: dialogStatus,
        cancellationReason,
      })
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث الطلب.')
    } finally {
      setIsUpdating(false)
    }
  }

  function handlePrintReceipt() {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    const orderDate = order.created_at
      ? new Date(order.created_at).toLocaleString('ar-IQ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'تاريخ غير متوفر'

    const itemsHtml = (order.items ?? [])
      .map(
        (item) => `
          <tr>
            <td style="text-align:left">${item.name} × ${item.quantity}</td>
            <td style="text-align:right">${(item.price ?? 0).toLocaleString('ar-IQ')} د.ع</td>
          </tr>
        `
      )
      .join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>فاتورة طلب #${order.id.slice(0, 8)}</title>
          <style>
            @page { margin: 0; }
            body {
              width: 80mm;
              font-family: sans-serif;
              color: black;
              margin: 0 auto;
              padding: 10px;
              text-align: center;
            }
            .left { text-align: left; }
            .right { text-align: right; }
            table { width: 100%; margin-top: 10px; border-collapse: collapse; }
            td, th { padding: 4px; font-size: 12px; border-bottom: 1px dashed #ccc; }
            h1 { margin: 0; font-size: 16px; }
            p { margin: 4px 0; font-size: 12px; }
            .header { border-bottom: 1px dashed #666; padding-bottom: 8px; }
            .divider { border-bottom: 1px dashed #666; margin: 8px 0; }
            .total { font-weight: bold; border-top: 1px solid #000; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${dynamicRestaurantName}</h1>
            <p>طلب رقم: #${order.id.slice(0, 8)}</p>
            <p>التاريخ: ${orderDate}</p>
          </div>

          <div class="divider"></div>

          <p class="left"><strong>العميل:</strong> ${order.customer_name}</p>
          <p class="left"><strong>الهاتف:</strong> ${order.customer_phone}</p>
          ${order.customer_address ? `<p class="left"><strong>العنوان:</strong> ${order.customer_address}</p>` : ''}

          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th class="left">الوجبة</th>
                <th class="right">السعر</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="total">
            <div class="left">الإجمالي النهائي:</div>
            <div class="right">${(order.total_amount ?? 0).toLocaleString('ar-IQ')} د.ع</div>
          </div>

          <div class="divider"></div>

          <p style="font-size: 10px; text-align:center;">شكراً لكم على زيارتكم!</p>

          <script>
            window.onafterprint = function() {
              const iframe = window.frameElement;
              if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
              }
            };
            window.print();
          </script>
        </body>
      </html>
    `

    iframe.contentWindow!.document.open()
    iframe.contentWindow!.document.write(htmlContent)
    iframe.contentWindow!.document.close()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className='w-full max-w-lg p-0 print:hidden'>
          <SheetHeader className='flex items-center justify-between gap-2 p-5'>
            <SheetTitle className='text-lg font-bold'>تفاصيل الطلب</SheetTitle>
            <div className='flex items-center gap-1 text-muted-foreground'>
              <span className='text-xs font-medium'>
                #{order.id.slice(0, 8)}
              </span>
            </div>
          </SheetHeader>

          <div className='divide-y divide-border px-5 py-4'>
            <div className='space-y-4'>
              {/* Customer Info */}
              <div className='space-y-2'>
                <h3 className='text-sm font-semibold text-muted-foreground'>
                  بيانات الزبون
                </h3>
                <div className='grid gap-2 text-sm'>
                  <div className='flex justify-between border-b pb-1'>
                    <span className='text-muted-foreground'>الاسم</span>
                    <span className='font-medium'>{order.customer_name}</span>
                  </div>
                  <div className='flex justify-between border-b pb-1'>
                    <span className='text-muted-foreground'>الهاتف</span>
                    <span className='font-mono font-medium'>
                      {order.customer_phone}
                    </span>
                  </div>
                  {order.customer_address && (
                    <div className='flex justify-between border-b pb-1'>
                      <span className='text-muted-foreground'>العنوان</span>
                      <span className='max-w-xs truncate text-muted-foreground'>
                        {order.customer_address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className='space-y-2'>
                <h3 className='text-sm font-semibold text-muted-foreground'>
                  الوجبات المطلوبة
                </h3>
                <div className='space-y-2'>
                  {(order.items ?? []).map((item, idx) => (
                    <div
                      key={item.menu_item_id ?? idx}
                      className='flex items-center justify-between border-b pb-2 text-sm'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{item.name}</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='font-mono font-medium text-muted-foreground'>
                          × {item.quantity}
                        </span>
                        <span className='font-medium' dir='ltr'>
                          {(item.price ?? 0).toLocaleString('ar-IQ')} د.ع
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              {order.discount_amount > 0 && (
                <div className='rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'>
                  <p className='font-semibold'>تفاصيل الخصم</p>
                  <p className='mt-1'>{order.discount_description ?? (order.discount_code ? `بروموكود ${order.discount_code}` : 'خصم مطبق على الطلب')}</p>
                  <p className='mt-1'>قيمة الخصم الفعلية: {Number(order.discount_amount).toLocaleString('ar-IQ')} د.ع</p>
                </div>
              )}
              <div className='mt-3 flex items-center justify-between border-t border-border pt-3 text-lg font-bold'>
                <span>الإجمالي النهائي</span>
                <span dir='ltr' className='text-primary'>
                  {(order.total_amount ?? 0).toLocaleString('ar-IQ')} د.ع
                </span>
              </div>
            </div>
          </div>

          {/* Status Selector */}
          <div className='space-y-3 border-t border-border px-5 py-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-muted-foreground'>
                تغيير حالة الطلب
              </label>
              <Select
                onValueChange={(val) => {
                  const status = val as Order['status']
                  setDialogStatus(status)
                  if (status !== 'cancelled') setCancellationReason('')
                }}
                value={dialogStatus}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='اختر الحالة' />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant={STATUS_VARIANTS[dialogStatus]} className='mt-2'>
              {STATUS_LABELS[dialogStatus]}
            </Badge>
            {dialogStatus === 'cancelled' && (
              <div className='space-y-2'>
                <label
                  htmlFor='cancellation-reason'
                  className='text-sm font-medium text-destructive'
                >
                  سبب الإلغاء
                </label>
                <Textarea
                  id='cancellation-reason'
                  value={cancellationReason}
                  onChange={(event) =>
                    setCancellationReason(event.target.value.slice(0, 240))
                  }
                  placeholder='مثال: طلب العميل الإلغاء أو العنوان خارج نطاق التوصيل'
                  required
                />
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className='flex items-center justify-between gap-3 border-t border-border px-5 py-4'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
              className='print:hidden'
            >
              إغلاق
            </Button>
            <Button
              size='sm'
              className='w-48 print:hidden'
              disabled={isUpdating || dialogStatus === order.status}
              onClick={handleStatusChange}
            >
              {isUpdating ? 'جارٍ التحديث...' : 'تحديث الحالة'}
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='print:hidden'
              onClick={handlePrintReceipt}
            >
              <Printer className='mr-1.5 size-4' />
              طباعة الفاتورة
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
