import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { MAX_CART_ITEM_QUANTITY, useCartStore } from '@/stores/cart-store'
import { getMenuImageUrl, supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useRestaurantSettingsApi } from '@/features/orders/restaurant-settings-api'

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId?: string
}

type CheckoutStep = 'items' | 'customer' | 'confirm'

interface PublicOrderResult {
  id: string
  total_amount: number
  items: Array<{
    name: string
    price: number
    quantity: number
    total: number
    notes?: string
  }>
}

interface DeliveryZone {
  id: string
  name: string
  delivery_fee: number
  minimum_order: number
}

function publicImageUrl(path: string | null) {
  if (!path) return null
  return path.startsWith('https://') || path.startsWith('http://')
    ? path
    : getMenuImageUrl(path)
}

function validPhone(phone: string) {
  return /^[+0-9 ()-]{7,25}$/.test(phone.trim())
}

function safeWhatsAppNumber(value: string | null) {
  const digits = value?.replace(/\D/g, '') ?? ''
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null
}

export function CartSheet({
  open,
  onOpenChange,
  restaurantId,
}: CartSheetProps) {
  const { items, removeItem, setQuantity, clear, itemCount } = useCartStore()
  const { fetchSettings } = useRestaurantSettingsApi()
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('items')
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
  })
  const [promoCode, setPromoCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderingMode, setOrderingMode] = useState<'system' | 'whatsapp'>(
    'system'
  )
  const [whatsappNumber, setWhatsAppNumber] = useState<string | null>(null)
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([])
  const [deliveryZoneId, setDeliveryZoneId] = useState('')

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )
  const customerName = customerInfo.name.trim().replace(/\s+/g, ' ')
  const customerPhone = customerInfo.phone.trim()
  const customerAddress = customerInfo.address.trim().replace(/\s+/g, ' ')
  const customerValid = customerName.length >= 2 && validPhone(customerPhone)
  const selectedZone = deliveryZones.find((zone) => zone.id === deliveryZoneId)
  const deliveryFee = selectedZone?.delivery_fee ?? 0
  const totalWithDelivery = subtotal + deliveryFee
  const meetsZoneMinimum = !selectedZone || subtotal >= selectedZone.minimum_order

  useEffect(() => {
    if (!open || !restaurantId) return
    let live = true
    void fetchSettings(restaurantId)
      .then((settings) => {
        if (!live || !settings) return
        setOrderingMode(
          settings.ordering_mode === 'whatsapp' ? 'whatsapp' : 'system'
        )
        setWhatsAppNumber(settings.whatsapp_number)
      })
      .catch(() => {
        if (live) setOrderingMode('system')
      })
    return () => {
      live = false
    }
  }, [fetchSettings, open, restaurantId])

  useEffect(() => {
    if (!open || !restaurantId) return
    void supabase.from('delivery_zones').select('id, name, delivery_fee, minimum_order').eq('restaurant_id', restaurantId).eq('is_active', true).order('sort_order')
      .then(({ data }) => setDeliveryZones((data ?? []) as DeliveryZone[]))
  }, [open, restaurantId])

  function closeCart() {
    setCheckoutStep('items')
    onOpenChange(false)
  }

  async function handleCheckout() {
    if (!restaurantId || !items.length || !customerValid) return
    setIsSubmitting(true)

    try {
      // الخادم يعيد تسعير العناصر ويتحقق من توفرها؛ لا نرسل اسمًا أو سعرًا أو إجماليًا موثوقًا من المتصفح.
      const orderPayload = {
        p_restaurant_id: restaurantId,
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_customer_address: customerAddress || null,
        p_promo_code: promoCode.trim().slice(0, 64) || null,
        p_items: items.map((item) => ({
          item_id: item.id,
          quantity: item.quantity,
          notes: item.notes ?? null,
        })),
        p_delivery_zone_id: deliveryZoneId || null,
      }
      let { data, error } = await supabase.rpc('create_public_order_with_delivery', orderPayload)
      // يسمح استمرار استقبال الطلبات في المشاريع التي لم تطبق ترحيل 0005 بعد.
      if (error?.code === 'PGRST202') {
        const legacy = await supabase.rpc('create_public_order', {
          p_restaurant_id: restaurantId,
          p_customer_name: customerName,
          p_customer_phone: customerPhone,
          p_customer_address: customerAddress || null,
          p_promo_code: promoCode.trim().slice(0, 64) || null,
          p_items: items.map((item) => ({ item_id: item.id, quantity: item.quantity, notes: item.notes ?? null })),
        })
        data = legacy.data
        error = legacy.error
      }
      if (error) throw error

      const order = data as PublicOrderResult
      if (orderingMode === 'whatsapp') {
        const number = safeWhatsAppNumber(whatsappNumber)
        if (!number) {
          toast.success('تم تسجيل طلبك بنجاح', {
            description: 'سيتواصل معك المطعم لتأكيده.',
          })
        } else {
          const message = [
            'طلب جديد من المنيو الرقمي',
            '',
            `رقم الطلب: ${order.id.slice(0, 8)}`,
            `الاسم: ${customerName}`,
            `الهاتف: ${customerPhone}`,
            customerAddress ? `العنوان: ${customerAddress}` : '',
            '',
            ...order.items.map(
              (item) =>
                `• ${item.name} × ${item.quantity} — ${Number(item.total).toLocaleString('ar-IQ')} د.ع`
            ),
            '',
            `الإجمالي: ${Number(order.total_amount).toLocaleString('ar-IQ')} د.ع`,
          ]
            .filter(Boolean)
            .join('\n')
          const popup = window.open(
            `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
            '_blank',
            'noopener,noreferrer'
          )
          toast.success('تم تسجيل الطلب', {
            description: popup
              ? 'يفتح واتساب لإرسال نسخة الطلب.'
              : 'سيتواصل معك المطعم لتأكيده.',
          })
        }
      } else {
        toast.success('تم إرسال طلبك بنجاح', {
          description: `الإجمالي المؤكد ${Number(order.total_amount).toLocaleString('ar-IQ')} د.ع`,
        })
      }

      clear()
      setCustomerInfo({ name: '', phone: '', address: '' })
      setPromoCode('')
      closeCart()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر إرسال الطلب. راجع الأصناف وحاول مرة أخرى.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        dir='rtl'
        className='flex h-full w-full max-w-md flex-col bg-background p-0'
      >
        <div className='flex items-center justify-between border-b border-border px-5 py-4'>
          <div className='flex items-center gap-2'>
            {checkoutStep !== 'items' && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-8'
                onClick={() =>
                  setCheckoutStep(
                    checkoutStep === 'confirm' ? 'customer' : 'items'
                  )
                }
                aria-label='رجوع'
              >
                <ArrowRight className='size-4' />
              </Button>
            )}
            <SheetTitle className='text-lg font-extrabold'>
              {checkoutStep === 'items'
                ? 'سلة الطلب'
                : checkoutStep === 'customer'
                  ? 'بيانات الطلب'
                  : 'تأكيد الطلب'}
            </SheetTitle>
          </div>
          {checkoutStep === 'items' && (
            <Badge variant='secondary'>{itemCount} قطعة</Badge>
          )}
        </div>

        {checkoutStep === 'items' && (
          <>
            {items.length === 0 ? (
              <div className='flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground'>
                <div className='flex size-16 items-center justify-center rounded-3xl bg-muted'>
                  <ShoppingBag className='size-7' />
                </div>
                <p className='font-medium'>السلة تنتظر اختياراتك</p>
              </div>
            ) : (
              <div className='flex-1 divide-y divide-border overflow-y-auto px-5'>
                {items.map((item) => {
                  const image = publicImageUrl(item.imagePath)
                  return (
                    <div key={item.lineId} className='flex gap-3 py-4'>
                      {image ? (
                        <img
                          src={image}
                          alt=''
                          className='size-16 rounded-xl object-cover'
                        />
                      ) : (
                        <div className='flex size-16 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground'>
                          صورة
                        </div>
                      )}
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-bold'>
                          {item.name}
                        </p>
                        {item.notes && (
                          <p className='mt-0.5 line-clamp-1 text-xs text-muted-foreground'>
                            {item.notes}
                          </p>
                        )}
                        <p className='mt-1 text-xs font-semibold text-primary'>
                          {item.price.toLocaleString('ar-IQ')} د.ع
                        </p>
                        <div className='mt-2 flex items-center gap-2'>
                          <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            className='size-7'
                            onClick={() =>
                              setQuantity(item.lineId, item.quantity - 1)
                            }
                            aria-label='إنقاص الكمية'
                          >
                            <Minus className='size-3.5' />
                          </Button>
                          <span className='min-w-5 text-center text-sm font-bold'>
                            {item.quantity}
                          </span>
                          <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            className='size-7'
                            disabled={item.quantity >= MAX_CART_ITEM_QUANTITY}
                            onClick={() =>
                              setQuantity(item.lineId, item.quantity + 1)
                            }
                            aria-label='زيادة الكمية'
                          >
                            <Plus className='size-3.5' />
                          </Button>
                        </div>
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='size-8 text-muted-foreground hover:text-destructive'
                        onClick={() => removeItem(item.lineId)}
                        aria-label={`حذف ${item.name}`}
                      >
                        <Trash2 className='size-4' />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
            <div className='border-t border-border bg-background p-5'>
              <div className='mb-4 flex items-end justify-between'>
                <span className='text-sm text-muted-foreground'>
                  المجموع المتوقع
                </span>
                <strong className='text-lg'>
                  {subtotal.toLocaleString('ar-IQ')} د.ع
                </strong>
              </div>
              <label className='mb-3 block'>
                <span className='mb-1.5 block text-xs font-medium text-muted-foreground'>
                  كود الخصم (اختياري)
                </span>
                <Input
                  value={promoCode}
                  maxLength={64}
                  onChange={(event) => setPromoCode(event.target.value)}
                  placeholder='أدخل كود الخصم'
                  className='h-9'
                />
              </label>
              <Button
                type='button'
                className='w-full py-5 font-bold'
                disabled={!items.length || !meetsZoneMinimum}
                onClick={() => setCheckoutStep('customer')}
              >
                متابعة الطلب
              </Button>
              <p className='mt-2 text-center text-[11px] text-muted-foreground'>
                سيؤكّد المطعم السعر والتوفّر قبل اعتماد الطلب.
              </p>
              {selectedZone && !meetsZoneMinimum && <p className='mt-2 text-center text-[11px] text-destructive'>الحد الأدنى لمنطقة {selectedZone.name}: {selectedZone.minimum_order.toLocaleString('ar-IQ')} د.ع</p>}
            </div>
          </>
        )}

        {checkoutStep === 'customer' && (
          <form
            className='flex flex-1 flex-col p-5'
            onSubmit={(event) => {
              event.preventDefault()
              if (customerValid) setCheckoutStep('confirm')
            }}
          >
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='customer-name'>الاسم</Label>
                <Input
                  id='customer-name'
                  autoComplete='name'
                  value={customerInfo.name}
                  maxLength={80}
                  onChange={(event) =>
                    setCustomerInfo((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder='اسم المستلم'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='customer-phone'>رقم الهاتف</Label>
                <Input
                  id='customer-phone'
                  autoComplete='tel'
                  inputMode='tel'
                  value={customerInfo.phone}
                  maxLength={25}
                  onChange={(event) =>
                    setCustomerInfo((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder='+964 7XX XXX XXXX'
                  required
                />
                <p className='text-xs text-muted-foreground'>
                  سنستخدمه فقط لتأكيد الطلب.
                </p>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='customer-address'>
                  العنوان{' '}
                  <span className='text-muted-foreground'>(اختياري)</span>
                </Label>
                <Input
                  id='customer-address'
                  autoComplete='street-address'
                  value={customerInfo.address}
                  maxLength={240}
                  onChange={(event) =>
                    setCustomerInfo((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  placeholder='المنطقة، الشارع، أقرب نقطة دالة'
                />
              </div>
              {deliveryZones.length > 0 && <div className='space-y-2'>
                <Label htmlFor='delivery-zone'>منطقة التوصيل</Label>
                <select id='delivery-zone' value={deliveryZoneId} onChange={(event) => setDeliveryZoneId(event.target.value)} className='flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm'>
                  <option value=''>اختر المنطقة</option>
                  {deliveryZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name} — {zone.delivery_fee.toLocaleString('ar-IQ')} د.ع</option>)}
                </select>
                {selectedZone && <p className='text-xs text-muted-foreground'>سعر التوصيل: {deliveryFee.toLocaleString('ar-IQ')} د.ع</p>}
              </div>}
            </div>
            {!customerInfo.phone || validPhone(customerInfo.phone) ? null : (
              <p className='mt-3 text-xs text-destructive'>
                أدخل رقم هاتف صالحًا.
              </p>
            )}
            <Button
              type='submit'
              className='mt-auto w-full py-5 font-bold'
              disabled={!customerValid || !meetsZoneMinimum || (deliveryZones.length > 0 && !deliveryZoneId)}
            >
              مراجعة الطلب
            </Button>
          </form>
        )}

        {checkoutStep === 'confirm' && (
          <div className='flex flex-1 flex-col p-5'>
            <div className='rounded-2xl bg-muted/55 p-4 text-sm'>
              <p className='font-bold'>{customerName}</p>
              <p className='mt-1 text-muted-foreground' dir='ltr'>
                {customerPhone}
              </p>
              {customerAddress && (
                <p className='mt-1 text-muted-foreground'>{customerAddress}</p>
              )}
            </div>
            <div className='mt-5 space-y-2 border-b border-border pb-5 text-sm'>
              {items.map((item) => (
                <div key={item.lineId} className='flex justify-between gap-3'>
                  <span className='truncate'>
                    {item.name} × {item.quantity}
                  </span>
                  <span className='shrink-0'>
                    {(item.price * item.quantity).toLocaleString('ar-IQ')} د.ع
                  </span>
                </div>
              ))}
            </div>
            <div className='mt-4 flex justify-between text-lg font-extrabold'>
              <span>الإجمالي المتوقع</span>
              <span>{totalWithDelivery.toLocaleString('ar-IQ')} د.ع</span>
            </div>
            {selectedZone && <div className='mt-2 flex justify-between text-xs text-muted-foreground'><span>التوصيل إلى {selectedZone.name}</span><span>{deliveryFee.toLocaleString('ar-IQ')} د.ع</span></div>}
            {promoCode.trim() && (
              <p className='mt-2 text-xs text-muted-foreground'>
                سيتم التحقق من كود «{promoCode.trim()}» عند الإرسال.
              </p>
            )}
            <p className='mt-3 text-xs leading-5 text-muted-foreground'>
              يتم التحقق من أسعار الأصناف وتوفّرها على الخادم لحظة الإرسال.
            </p>
            <Button
              type='button'
              className='mt-auto w-full py-5 font-bold'
              disabled={isSubmitting || !items.length}
              onClick={handleCheckout}
            >
              {isSubmitting ? 'جارٍ إرسال الطلب…' : 'تأكيد وإرسال الطلب'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
