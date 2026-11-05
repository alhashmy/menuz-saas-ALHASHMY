import { UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMenuImageUrl } from '@/lib/supabase'
import type { MenuTemplate } from '../templates/types'
import { applyItemOffer, type PublicItemOffer, type PublicMenuItem } from '../api'

interface ItemCardProps {
  item: PublicMenuItem
  accentColor: string
  template: MenuTemplate
  animationDelayMs?: number
  offer?: PublicItemOffer
  onSelect: () => void
}

function PriceTag({
  price,
  offer,
  accentColor,
  size = 'sm',
}: {
  price: number
  offer: PublicItemOffer | undefined
  accentColor: string
  size?: 'sm' | 'md'
}) {
  const { finalPrice, hasDiscount } = applyItemOffer(price, offer)
  const priceClass = size === 'md' ? 'text-sm' : 'text-xs'

  if (!hasDiscount) {
    return (
      <p className={cn(priceClass, 'font-bold')} style={{ color: accentColor }}>
        {price.toFixed(2)} ر.س
      </p>
    )
  }

  return (
    <div className='flex items-center gap-1.5'>
      <p className={cn(priceClass, 'font-bold')} style={{ color: accentColor }}>
        {finalPrice.toFixed(2)} ر.س
      </p>
      <p className='text-[11px] text-muted-foreground line-through'>
        {price.toFixed(2)}
      </p>
    </div>
  )
}

function DiscountBadge({ offer }: { offer: PublicItemOffer | undefined }) {
  if (!offer) return null
  const label =
    offer.discount_kind === 'percentage'
      ? `-${offer.discount_value}%`
      : `-${offer.discount_value} ر.س`
  return (
    <span className='absolute top-2 right-2 z-10 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow'>
      {label}
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

export function ItemCard({
  item,
  accentColor,
  template,
  animationDelayMs = 0,
  offer,
  onSelect,
}: ItemCardProps) {
  const imageUrl = getMenuImageUrl(item.image_path)
  const name = item.name_ar ?? item.name
  const desc = item.description_ar ?? item.description
  const animClass = animationClass(template)
  const style = {
    ['--menu-accent' as string]: accentColor,
    animationDelay: `${animationDelayMs}ms`,
  }

  const placeholder = (
    <div className='flex h-full w-full items-center justify-center bg-muted text-muted-foreground'>
      <UtensilsCrossed className='size-6' />
    </div>
  )

  // Overlay: صورة خلفية كاملة + تدرّج + نص أبيض فوقها
  if (template.cardLayout === 'overlay') {
    return (
      <button
        type='button'
        onClick={onSelect}
        style={style}
        className={cn(
          'relative aspect-[4/3] w-full overflow-hidden rounded-xl text-start',
          template.id === 'glassmorphism' && 'menu-glass',
          animClass
        )}
      >
        <DiscountBadge offer={offer} />
        {imageUrl ? (
          <img src={imageUrl} alt={name} className='absolute inset-0 size-full object-cover' />
        ) : (
          <div className='absolute inset-0 bg-muted' />
        )}
        <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />
        <div className='absolute inset-x-0 bottom-0 p-3'>
          <h3 className='font-semibold text-white'>{name}</h3>
          <PriceTag price={item.price} offer={offer} accentColor={accentColor} size='md' />
        </div>
      </button>
    )
  }

  // Magazine: صورة كبيرة بعرض كامل فوق، نص تحتها
  if (template.cardLayout === 'magazine') {
    return (
      <button
        type='button'
        onClick={onSelect}
        style={style}
        className={cn('relative w-full overflow-hidden rounded-xl border text-start', animClass)}
      >
        <div className='relative h-40 w-full'>
          <DiscountBadge offer={offer} />
          {imageUrl ? (
            <img src={imageUrl} alt={name} className='size-full object-cover' />
          ) : (
            placeholder
          )}
        </div>
        <div className='p-3'>
          <h3 className='font-semibold'>{name}</h3>
          {desc && <p className='mt-0.5 line-clamp-2 text-xs text-muted-foreground'>{desc}</p>}
          <div className='mt-1'>
            <PriceTag price={item.price} offer={offer} accentColor={accentColor} size='md' />
          </div>
        </div>
      </button>
    )
  }

  // Grid: بطاقة عمودية مضغوطة (صورة فوق، نص تحت) ضمن شبكة عمودين
  if (template.cardLayout === 'grid') {
    return (
      <button
        type='button'
        onClick={onSelect}
        style={style}
        className={cn(
          'flex flex-col overflow-hidden rounded-xl border bg-card text-start shadow-sm',
          animClass
        )}
      >
        <div className='relative h-24 w-full'>
          <DiscountBadge offer={offer} />
          {imageUrl ? (
            <img src={imageUrl} alt={name} className='size-full object-cover' />
          ) : (
            placeholder
          )}
        </div>
        <div className='p-2.5'>
          <h3 className='truncate text-sm font-semibold'>{name}</h3>
          <div className='mt-0.5'>
            <PriceTag price={item.price} offer={offer} accentColor={accentColor} />
          </div>
        </div>
      </button>
    )
  }

  // List (الافتراضي): صورة يسار، نص يمين، بعرض كامل
  return (
    <button
      type='button'
      onClick={onSelect}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card p-3 text-start shadow-sm transition-transform active:scale-[0.98]',
        animClass
      )}
    >
      <div className='relative size-16 shrink-0 overflow-hidden rounded-lg'>
        {offer && (
          <span className='absolute top-0.5 right-0.5 z-10 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow'>
            {offer.discount_kind === 'percentage'
              ? `-${offer.discount_value}%`
              : `-${offer.discount_value}`}
          </span>
        )}
        {imageUrl ? (
          <img src={imageUrl} alt={name} className='size-full object-cover' />
        ) : (
          placeholder
        )}
      </div>
      <div className='min-w-0 flex-1'>
        <h3 className='truncate font-semibold'>{name}</h3>
        {desc && <p className='mt-0.5 line-clamp-2 text-xs text-muted-foreground'>{desc}</p>}
        <div className='mt-1'>
          <PriceTag price={item.price} offer={offer} accentColor={accentColor} size='md' />
        </div>
      </div>
    </button>
  )
}
