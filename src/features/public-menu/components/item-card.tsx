import { UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/stores/cart-store'
import { Button } from '@/components/ui/button'
import type { MenuTemplate } from '../templates/types'
import { applyItemOffer, type PublicItemOffer, type PublicMenuItem } from '../api'

interface ItemCardProps {
  item: PublicMenuItem
  accentColor: string
  template: MenuTemplate
  animationDelayMs?: number
  offer?: PublicItemOffer
  onSelect: () => void
  isAvailable?: boolean
}

function PriceTag({
  price,
  offer,
  accentColor,
}: {
  price: number
  offer: PublicItemOffer | undefined
  accentColor: string
}) {
  const { finalPrice, hasDiscount } = applyItemOffer(price, offer)

  if (!hasDiscount) {
    return (
      <p className='text-lg font-bold text-primary' style={{ color: accentColor }}>
        {finalPrice.toLocaleString('ar-IQ')} د.ع
      </p>
    )
  }

  return (
    <div className='flex items-center gap-1.5'>
      <p className='text-lg font-bold text-primary' style={{ color: accentColor }}>
        {finalPrice.toLocaleString('ar-IQ')} د.ع
      </p>
      <p className='text-xs text-muted-foreground line-through'>
        {price.toFixed(2)} د.ع
      </p>
    </div>
  )
}

function DiscountBadge({ offer }: { offer: PublicItemOffer | undefined }) {
  if (!offer) return null
  const label =
    offer.discount_kind === 'percentage'
      ? `-${offer.discount_value}%`
      : `-${offer.discount_value} د.ع`
  return (
    <span className='absolute top-2 right-2 z-10 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow'>
      {label}
    </span>
  )
}

function UnavailableBadge() {
  return (
    <span className='absolute top-2 left-2 z-10 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow'>
      غير متوفر
    </span>
  )
}

function animationClass(template: MenuTemplate) {
  switch (template.animation) {
    case 'fade-up':
      return 'menu-anim-fade-up'
    case 'shimmer-gold':
      return 'menu-anim-shimmer-gold'
    case 'glow-pulse':
      return 'menu-anim-glow-pulse'
    case 'stagger-scale':
      return 'menu-anim-stagger-scale'
    default:
      return ''
  }
}

function placeholder(size: 'sm' | 'md') {
  return size === 'sm' ? (
    <div className='flex h-24 w-24 items-center justify-center bg-muted text-muted-foreground rounded-lg'>
      <UtensilsCrossed className='size-5' />
    </div>
  ) : (
    <div className='flex h-40 w-full items-center justify-center bg-muted text-muted-foreground rounded-lg'>
      <UtensilsCrossed className='size-6' />
    </div>
  )
}

export function ItemCard({
  item,
  accentColor,
  template,
  animationDelayMs = 0,
  offer,
  onSelect,
  isAvailable = true,
}: ItemCardProps) {
  const name = item.name_ar ?? item.name
  const desc = item.description_ar ?? item.description
  const animClass = animationClass(template)
  const style = {
    ['--menu-accent' as string]: accentColor,
    animationDelay: `${animationDelayMs}ms`,
  }
  const unavailable = !isAvailable

  const { addItem, increaseQuantity, decreaseQuantity, items } = useCartStore()
  const cartItem = items.find((i) => i.id === item.id)
  const quantity = cartItem?.quantity ?? 0
  const { finalPrice } = applyItemOffer(item.price, offer)

  function addToCart() {
    if (unavailable) return
    addItem({
      id: item.id,
      name,
      price: finalPrice,
      imagePath: item.image_path,
    })
  }

  function handleIncrease() {
    if (unavailable) return
    increaseQuantity(item.id)
  }

  function handleDecrease() {
    if (unavailable) return
    decreaseQuantity(item.id)
  }

  function renderButtonArea() {
    return (
      <div className='mt-auto pt-4 w-full'>
        {quantity === 0 ? (
            <Button
              type='button'
              size='sm'
              className='w-full font-bold text-md py-2'
              disabled={unavailable}
              onClick={(e) => {
                e.stopPropagation()
                addToCart()
              }}
            >
              + إضافة إلى الطلب
            </Button>
        ) : (
          <div className='flex items-center justify-between bg-muted rounded-md p-1 w-full border'>
            <Button
              type='button'
              size='icon'
              variant='secondary'
              className='h-10 w-12 text-lg p-0'
              disabled={unavailable}
              onClick={(e) => {
                e.stopPropagation()
                handleDecrease()
              }}
            >
              -
            </Button>
            <span className='font-bold text-lg px-4'>{quantity}</span>
            <Button
              type='button'
              size='icon'
              variant='default'
              className='h-10 w-12 text-lg p-0'
              disabled={unavailable}
              onClick={(e) => {
                e.stopPropagation()
                handleIncrease()
              }}
            >
              +
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Overlay: صورة خلفية أعلى النص، بطاقة واحدة بالعرض الكامل مع ارتفاع محدود
  if (template.cardLayout === 'overlay') {
    return (
      <div
        onClick={unavailable ? undefined : onSelect}
        style={style}
        className={cn(
          'relative overflow-hidden rounded-xl border bg-card text-start shadow-sm cursor-pointer',
          unavailable && 'opacity-60 grayscale pointer-events-none',
          template.id === 'glassmorphism' && 'menu-glass',
          animClass
        )}
      >
        <DiscountBadge offer={offer} />
        {unavailable && <UnavailableBadge />}
        <div className='relative h-40 w-full overflow-hidden rounded-xl'>
          {item.image_path ? (
            <img
              src={item.image_path || 'رابط_صورة_افتراضية_أو_فارغ'}
              alt={name}
              className='h-40 w-full object-cover object-center rounded-t-md'
            />
          ) : (
            placeholder('md')
          )}
          <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-xl' />
          <div className='absolute inset-x-0 bottom-0 p-3'>
            <h3 className='font-semibold text-white truncate'>{name}</h3>
            <PriceTag price={item.price} offer={offer} accentColor={accentColor} />
            {renderButtonArea()}
          </div>
        </div>
      </div>
    )
  }

  // Magazine: صورة كبيرة بعرض كامل فوق، نص تحتها (ارتفاع محدود)
  if (template.cardLayout === 'magazine') {
    return (
      <div
        onClick={unavailable ? undefined : onSelect}
        style={style}
        className={cn(
          'relative w-full overflow-hidden rounded-xl border bg-card text-start shadow-sm cursor-pointer',
          unavailable && 'opacity-60 grayscale pointer-events-none',
          animClass
        )}
      >
        <div className='relative h-40 w-full overflow-hidden rounded-t-xl'>
          <DiscountBadge offer={offer} />
          {unavailable && <UnavailableBadge />}
          {item.image_path ? (
            <img
              src={item.image_path || 'رابط_صورة_افتراضية_أو_فارغ'}
              alt={name}
              className='h-40 w-full object-cover object-center rounded-t-md'
            />
          ) : (
            placeholder('md')
          )}
        </div>
        <div className='p-3 pt-2'>
          <h3 className='truncate text-base font-semibold mb-1'>{name}</h3>
          {desc && <p className='mt-0 line-clamp-2 text-xs text-muted-foreground mb-2'>{desc}</p>}
          <div className='mt-1'>
            <PriceTag price={item.price} offer={offer} accentColor={accentColor} />
            {renderButtonArea()}
          </div>
        </div>
      </div>
    )
  }

  // Grid: بطاقة عمودية مضغوطة (صورة فوق، نص تحت) ضمن شبكة عمودين
  if (template.cardLayout === 'grid') {
    return (
      <div
        onClick={unavailable ? undefined : onSelect}
        style={style}
        className={cn(
          'flex flex-col overflow-hidden rounded-xl border bg-card text-start shadow-sm cursor-pointer',
          unavailable && 'opacity-60 grayscale pointer-events-none',
          animClass
        )}
      >
        <div className='relative h-40 w-full overflow-hidden'>
          <DiscountBadge offer={offer} />
          {unavailable && <UnavailableBadge />}
          {item.image_path ? (
            <img
              src={item.image_path || 'رابط_صورة_افتراضية_أو_فارغ'}
              alt={name}
              className='h-40 w-full object-cover object-center rounded-t-md'
            />
          ) : (
            placeholder('md')
          )}
        </div>
        <div className='p-3 pt-2'>
          <h3 className='truncate text-sm font-semibold mb-1'>{name}</h3>
          <div className='mt-0.5 mb-2'>
            <PriceTag price={item.price} offer={offer} accentColor={accentColor} />
            {renderButtonArea()}
          </div>
        </div>
      </div>
    )
  }

  // List (الافتراضي): صورة مربعة صغيرة بجانب النص على اليسار.
  return (
    <div
      onClick={unavailable ? undefined : onSelect}
      style={style}
      className={cn(
        'flex items-center gap-4 rounded-xl border bg-card p-3 text-start shadow-sm cursor-pointer transition-transform active:scale-[0.98]',
        unavailable && 'opacity-60 grayscale pointer-events-none',
        animClass
      )}
    >
      <div className='relative shrink-0 overflow-hidden rounded-lg border border-muted/40'>
        {offer && (
          <span className='absolute top-0.5 right-0.5 z-10 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow'>
            {offer.discount_kind === 'percentage'
              ? `-${offer.discount_value}%`
              : `-${offer.discount_value} د.ع`}
          </span>
        )}
        {unavailable && <UnavailableBadge />}
        {item.image_path ? (
          <img src={item.image_path || 'رابط_صورة_افتراضية_أو_فارغ'} alt={name} className='h-24 w-24 object-cover object-center' />
        ) : (
          placeholder('sm')
        )}
      </div>
      <div className='min-w-0 flex-1'>
        <h3 className='truncate text-base font-semibold mb-1'>{name}</h3>
        {desc && <p className='mt-0 line-clamp-2 text-xs text-muted-foreground mb-2'>{desc}</p>}
        <div className='mt-1'>
          <PriceTag price={item.price} offer={offer} accentColor={accentColor} />
          {renderButtonArea()}
        </div>
      </div>
    </div>
  )
}
