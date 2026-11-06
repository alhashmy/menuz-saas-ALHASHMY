import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getMenuImageUrl } from '@/lib/supabase'
import { useCartStore } from '@/stores/cart-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useCreateOrder } from '@/features/orders/api'
import { useRestaurantSettingsApi } from '@/features/orders/restaurant-settings-api'
import { useState, useEffect } from 'react'

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId?: string
}

export function CartSheet({ open, onOpenChange, restaurantId }: CartSheetProps) {
  const { items, removeItem, setQuantity, clear, itemCount } = useCartStore()
  const createOrder = useCreateOrder()
  const { fetchSettings } = useRestaurantSettingsApi()

  const [checkoutStep, setCheckoutStep] = useState<'items' | 'customer' | 'confirm'>('items')
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderingMode, setOrderingMode] = useState<'system' | 'whatsapp' | null>(null)
  const [whatsappNumber, setWhatsAppNumber] = useState<string | null>(null)

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
    0
  )
  const discountAmount = 0

  useEffect(() => {
    if (open && restaurantId) {
      ;(async () => {
        try {
          const settings = await fetchSettings(restaurantId)
          if (settings) {
            setOrderingMode(settings.ordering_mode)
            setWhatsAppNumber(settings.whatsapp_number)
          }
        } catch {
          //silent
        }
      })()
    }
  }, [open, restaurantId, fetchSettings])

  async function handleCheckout() {
    if (items.length === 0) return
    if (!restaurantId) {
      toast.error('لا يوجد مطعم مرتبط بالقائمة الحالية.')
      return
    }

    if (orderingMode === 'whatsapp') {
      if (!whatsappNumber) {
        toast.error('لم يتم ضبط رقم واتساب للمطعم.')
        return
      }

      const message = [
        'طلب جديد من المنيو الرقمي:',
        '',
        `👤 الاسم: ${customerInfo.name}`,
        `📞 الهاتف: ${customerInfo.phone}`,
        customerInfo.address ? `📍 العنوان: ${customerInfo.address}` : '',
        '',
        '🛒 الوجبات المطلوبة:',
        ...items.map(
          (item) =>
            `- ${item.name} × ${item.quantity} - ${(item.price ?? 0).toLocaleString('ar-IQ')} د.ع`
        ),
        '',
        `💰 الإجمالي النهائي: ${(subtotal ?? 0).toLocaleString('ar-IQ')} د.ع`,
      ]
        .filter(Boolean)
        .join('\n')

      const encodedMessage = encodeURIComponent(message)
      const url = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`

      window.open(url, '_blank')
      toast('تم توجيه الطلب إلى واتساب', {
        description: 'سيتم فتح واتساب لإتمام الطلب.',
      })
      clear()
      setCheckoutStep('items')
      onOpenChange(false)
      return
    }

    // system mode
    setIsSubmitting(true)
    try {
      await createOrder.mutateAsync({
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address || null,
        items: items.map((item) => ({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
        })),
        discount_code: null,
        discount_amount: discountAmount,
        total: subtotal,
      })

      toast('تم إرسال الطلب بنجاح', {
        description: `مبلغ ${(subtotal ?? 0).toLocaleString('ar-IQ')} د.ع`,
      })
      clear()
      setCheckoutStep('items')
      onOpenChange(false)
    } catch {
      toast.error('تعذر إرسال الطلب. حاول مرة أخرى.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='max-w-sm w-full h-full bg-background p-0'
      >
        {/* Step 1: Cart Items */}
        {checkoutStep === 'items' && (
          <>
            <div className='p-4 border-b border-border'>
              <div className='flex items-center justify-between gap-2'>
                <SheetTitle className='text-lg font-bold'>سلة الطلبات</SheetTitle>
                <span className='flex items-center gap-1 text-muted-foreground'>
                  <ShoppingCart className='size-4' />
                  <span className='text-sm font-medium'>{itemCount} صنف</span>
                </span>
              </div>
            </div>

            {items.length === 0 ? (
              <div className='flex flex-col items-center justify-center gap-2 px-6 py-20 text-center text-muted-foreground'>
                <ShoppingCart className='size-12 opacity-40' />
                <p>سلتك فارغة حالياً.</p>
              </div>
            ) : (
              <div className='flex-1 overflow-y-auto divide-y divide-border px-4'>
                {items.map((item) => {
                  const imageUrl = getMenuImageUrl(item.imagePath)
                  return (
                    <div key={item.id} className='flex items-center gap-3 p-3'>
                      <div className='relative shrink-0 overflow-hidden rounded-md border border-muted/40'>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.name}
                            className='w-16 h-16 object-cover object-center'
                          />
                        ) : (
                          <div className='flex w-16 h-16 items-center justify-center bg-muted text-muted-foreground'>
                            <span className='text-[10px]'>صورة</span>
                          </div>
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-semibold truncate'>{item.name}</p>
                        <p className='text-xs text-muted-foreground' dir='ltr'>
                          {item.price.toFixed(2)} د.ع × {item.quantity}
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-8 w-8 p-0'
                          onClick={() =>
                            setQuantity(item.id, Math.max(0, item.quantity - 1))
                          }
                        >
                          <Minus className='size-4' />
                        </Button>
                        <Badge className='text-[11px] leading-none'>
                          {item.quantity}
                        </Badge>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='h-8 w-8 p-0'
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className='size-4' />
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-8 w-8 p-0 text-muted-foreground hover:text-destructive'
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className='size-4' />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Sticky Footer */}
            <div className='border-t border-border bg-background p-4'>
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>المجموع الفرعي</span>
                  <span dir='ltr' className='font-medium'>
                    {(subtotal ?? 0).toLocaleString('ar-IQ')} د.ع
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>الخصم</span>
                    <span dir='ltr' className='font-medium text-red-600'>
                      -{(discountAmount ?? 0).toLocaleString('ar-IQ')} د.ع
                    </span>
                  </div>
                )}
                <div className='flex items-center justify-between border-t border-border pt-2 mt-2 text-lg font-bold'>
                  <span>الإجمالي النهائي</span>
                  <span dir='ltr' className='text-primary'>
                    {(subtotal ?? 0).toLocaleString('ar-IQ')} د.ع
                  </span>
                </div>
              </div>
              <Button
                type='button'
                className='w-full mt-4 py-3 text-lg font-bold'
                onClick={() => setCheckoutStep('customer')}
              >
                متابعة لإدخال بيانات العميل
              </Button>
              <div className='mt-2 text-xs text-muted-foreground text-center'>
                يرجى مراجعة المنيو لإتمام الدفع والاستلام من المطعم.
              </div>
            </div>
          </>
        )}

        {/* Step 2: Customer Info */}
        {checkoutStep === 'customer' && (
          <>
            <div className='p-4 border-b border-border flex items-center justify-between'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setCheckoutStep('items')}
              >
                ← العودة
              </Button>
              <SheetTitle className='text-lg font-bold'>بيانات العميل</SheetTitle>
            </div>
            <form className='p-4 space-y-4' onSubmit={(e) => { e.preventDefault(); setCheckoutStep('confirm') }}>
              <div className='space-y-2'>
                <Label htmlFor='customer_name'>الاسم الكامل</Label>
                <Input
                  id='customer_name'
                  placeholder='أدخل اسمك الكامل'
                  value={customerInfo.name}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='customer_phone'>رقم الهاتف</Label>
                <Input
                  id='customer_phone'
                  type='tel'
                  placeholder='+964 7XX XXX XXX'
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, phone: e.target.value })
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='customer_address'>العنوان (اختياري)</Label>
                <Input
                  id='customer_address'
                  placeholder='شارع، حي، المدينة'
                  value={customerInfo.address}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, address: e.target.value })
                  }
                />
              </div>
              <Button
                type='submit'
                className='w-full'
                disabled={!customerInfo.name || !customerInfo.phone}
              >
                متابعة للتأكيد
              </Button>
            </form>
          </>
        )}

        {/* Step 3: Confirm */}
        {checkoutStep === 'confirm' && (
          <>
            <div className='p-4 border-b border-border flex items-center justify-between'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setCheckoutStep('customer')}
              >
                ← العودة
              </Button>
              <SheetTitle className='text-lg font-bold'>تأكيد الطلب</SheetTitle>
            </div>
            <div className='p-4 space-y-4'>
              <div className='space-y-2'>
                <p className='text-sm text-muted-foreground'>الاسم</p>
                <p className='font-medium'>{customerInfo.name}</p>
              </div>
              <div className='space-y-2'>
                <p className='text-sm text-muted-foreground'>الهاتف</p>
                <p className='font-medium'>{customerInfo.phone}</p>
              </div>
              {customerInfo.address && (
                <div className='space-y-2'>
                  <p className='text-sm text-muted-foreground'>العنوان</p>
                  <p className='font-medium'>{customerInfo.address}</p>
                </div>
              )}
              <div className='border-t border-border pt-4 space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>الإجمالي النهائي</span>
                  <span dir='ltr' className='font-bold text-lg text-primary'>
                    {(subtotal ?? 0).toLocaleString('ar-IQ')} د.ع
                  </span>
                </div>
              </div>
              <Button
                type='button'
                className='w-full py-3 text-lg font-bold'
                disabled={isSubmitting}
                onClick={handleCheckout}
              >
                {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
