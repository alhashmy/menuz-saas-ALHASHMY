import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronsUpDown, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { MAX_CART_ITEM_QUANTITY, useCartStore } from '@/stores/cart-store'
import { getMenuImageUrl, supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useRestaurantSettingsApi } from '@/features/orders/restaurant-settings-api'
import { isRestaurantAcceptingOrders, type OperatingHours } from '../api'

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId?: string
  restaurantIsOpen: boolean
  operatingHours: OperatingHours[]
  restaurantName: string
}

type CheckoutStep = 'items' | 'customer' | 'confirm'

interface PublicOrderResult {
  id: string
  daily_sequence: number
  total_amount: number
  delivery_fee: number
  delivery_zone_name: string | null
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
  restaurantIsOpen,
  operatingHours,
  restaurantName,
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
  const [zonePickerOpen, setZonePickerOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )
  const customerName = customerInfo.name.trim().replace(/\s+/g, ' ')
  const customerPhone = customerInfo.phone.trim()
  const customerAddress = customerInfo.address.trim().replace(/\s+/g, ' ')
  const customerValid = customerName.length >= 2 && validPhone(customerPhone) && customerAddress.length >= 5
  const selectedZone = deliveryZones.find((zone) => zone.id === deliveryZoneId)
  const deliveryFee = selectedZone?.delivery_fee ?? 0
  const totalWithDelivery = subtotal + deliveryFee
  const meetsZoneMinimum =
    !selectedZone || subtotal >= selectedZone.minimum_order
  const isAcceptingOrders = isRestaurantAcceptingOrders(
    restaurantIsOpen,
    operatingHours,
    now
  )

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

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
    void supabase
      .from('delivery_zones')
      .select('id, name, delivery_fee, minimum_order')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setDeliveryZones((data ?? []) as DeliveryZone[]))
  }, [open, restaurantId])

  function closeCart() {
    setCheckoutStep('items')
    onOpenChange(false)
  }

  async function handleCheckout() {
    if (!restaurantId || !items.length || !customerValid) return
    if (!isAcceptingOrders) {
      toast.error('المطعم مغلق حاليًا أو خارج أوقات التشغيل.')
      return
    }
    setIsSubmitting(true)

    try {
      // الخادم يعيد تسعير العناصر ويتحقق من توفرها؛ لا نرسل اسمًا أو سعرًا أو إجماليًا موثوقًا من المتصفح.
      const orderPayload = {
        p_restaurant_id: restaurantId,
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_customer_address: customerAddress,
        p_promo_code: promoCode.trim().slice(0, 64) || null,
        p_items: items.map((item) => ({
          item_id: item.id,
          quantity: item.quantity,
          notes: item.notes ?? null,
        })),
        p_delivery_zone_id: deliveryZoneId || null,
      }
      const { data, error } = await supabase.rpc(
        'create_public_order',
        orderPayload
      )
      if (error) throw error

      const order = data as PublicOrderResult
      if (orderingMode === 'whatsapp') {
        const number = safeWhatsAppNumber(whatsappNumber)
        if (!number) {
          toast.success('تم تسجيل طلبك بنجاح', {
            description: 'سيتواصل معك المطعم لتأكيده.',
          })
        } else {
          const deliveryAreaName =
            order.delivery_zone_name ??
            selectedZone?.name ??
            (customerAddress || 'غير محددة')
          const confirmedDeliveryFee = Number(order.delivery_fee ?? deliveryFee)
          const message = [
            `طلب جديد من المنيو الرقمي (${restaurantName})`,
            `رقم الطلب: ${order.daily_sequence}`,
            `الاسم: ${customerName}`,
            `الهاتف: ${customerPhone}`,
            `العنوان: (${deliveryAreaName})`,
            '_____ الايتمات _____',
            ...order.items.map(
              (item) =>
                `- ${item.name} × ${item.quantity} — ${Number(item.price).toLocaleString('ar-IQ')} د.ع`
            ),
            `- ${deliveryAreaName} توصيل ${confirmedDeliveryFee.toLocaleString('ar-IQ')}`,
            `الإجمالي: ${Number(order.total_amount).toLocaleString('ar-IQ')} د.ع`,
          ].join('\n')
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
      const responseError = error as {
        message?: string
        details?: string
        hint?: string
      }
      const message =
        responseError?.message ||
        responseError?.details ||
        responseError?.hint ||
        ''
      toast.error(
        message.includes('مغلق')
          ? 'المطعم مغلق حاليًا. يمكن تصفح المنيو لكن لا يمكن إرسال طلب.'
          : message.includes('متوفر')
            ? 'أحد الأطباق أصبح غير متوفر. احذفه من السلة ثم أعد المحاولة.'
            : message || 'تعذر إرسال الطلب. تحقق من اتصالك ثم أعد المحاولة.'
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
                disabled={
                  !items.length || !meetsZoneMinimum || !isAcceptingOrders
                }
                onClick={() => setCheckoutStep('customer')}
              >
                متابعة الطلب
              </Button>
              <p className='mt-2 text-center text-[11px] text-muted-foreground'>
                سيؤكّد المطعم السعر والتوفّر قبل اعتماد الطلب.
              </p>
              {!isAcceptingOrders && (
                <p className='mt-2 text-center text-[11px] text-destructive'>
                  المطعم لا يستقبل الطلبات حاليًا.
                </p>
              )}
              {selectedZone && !meetsZoneMinimum && (
                <p className='mt-2 text-center text-[11px] text-destructive'>
                  الحد الأدنى لمنطقة {selectedZone.name}:{' '}
                  {selectedZone.minimum_order.toLocaleString('ar-IQ')} د.ع
                </p>
              )}
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
                  العنوان التفصيلي <span className='text-destructive'>*</span>
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
                  required
                />
              </div>
              {deliveryZones.length > 0 && (
                <div className='space-y-2'>
                  <Label htmlFor='delivery-zone'>منطقة التوصيل</Label>
                  <Popover open={zonePickerOpen} onOpenChange={setZonePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button id='delivery-zone' type='button' variant='outline' role='combobox' aria-expanded={zonePickerOpen} className='w-full justify-between font-normal'>
                        {selectedZone ? `${selectedZone.name} — ${selectedZone.delivery_fee.toLocaleString('ar-IQ')} د.ع` : 'ابحث عن منطقة التوصيل'} <ChevronsUpDown className='size-4 opacity-50' />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' align='start'>
                      <Command><CommandInput placeholder='اكتب اسم المنطقة…' /><CommandList><CommandEmpty>لا توجد منطقة مطابقة.</CommandEmpty><CommandGroup>{deliveryZones.map((zone) => <CommandItem key={zone.id} value={`${zone.name} ${zone.delivery_fee}`} onSelect={() => { setDeliveryZoneId(zone.id); setZonePickerOpen(false) }}><Check className={`size-4 ${deliveryZoneId === zone.id ? 'opacity-100' : 'opacity-0'}`} />{zone.name} — {zone.delivery_fee.toLocaleString('ar-IQ')} د.ع</CommandItem>)}</CommandGroup></CommandList></Command>
                    </PopoverContent>
                  </Popover>
                  {selectedZone && (
                    <p className='text-xs text-muted-foreground'>
                      سعر التوصيل: {deliveryFee.toLocaleString('ar-IQ')} د.ع
                    </p>
                  )}
                </div>
              )}
            </div>
            {!customerInfo.phone || validPhone(customerInfo.phone) ? null : (
              <p className='mt-3 text-xs text-destructive'>
                أدخل رقم هاتف صالحًا.
              </p>
            )}
            {customerInfo.address && customerAddress.length >= 5 ? null : <p className='mt-3 text-xs text-destructive'>اكتب العنوان التفصيلي (5 أحرف على الأقل).</p>}
            <Button
              type='submit'
              className='mt-auto w-full py-5 font-bold'
              disabled={
                !customerValid ||
                !meetsZoneMinimum ||
                !isAcceptingOrders ||
                (deliveryZones.length > 0 && !deliveryZoneId)
              }
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
            {selectedZone && (
              <div className='mt-2 flex justify-between text-xs text-muted-foreground'>
                <span>التوصيل إلى {selectedZone.name}</span>
                <span>{deliveryFee.toLocaleString('ar-IQ')} د.ع</span>
              </div>
            )}
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
              disabled={isSubmitting || !items.length || !isAcceptingOrders}
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
