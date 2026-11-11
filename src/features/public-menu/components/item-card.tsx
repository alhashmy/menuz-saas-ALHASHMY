import type { CSSProperties } from 'react'
import { Minus, Plus, UtensilsCrossed } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { getMenuImageUrl } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  applyItemOffer,
  type PublicItemOffer,
  type PublicMenuItem,
} from '../api'
import type { MenuTemplate } from '../templates/types'
import './item-card.css'

interface ItemCardProps {
  item: PublicMenuItem
  accentColor: string
  themeMode: 'light' | 'dark'
  template: MenuTemplate
  animationDelayMs?: number
  offer?: PublicItemOffer
  onSelect: () => void
  isAvailable?: boolean
}

function imageUrl(path: string | null) {
  if (!path) return null
  return path.startsWith('https://') || path.startsWith('http://')
    ? path
    : getMenuImageUrl(path)
}

function offerLabel(offer: PublicItemOffer) {
  return offer.discount_kind === 'percentage'
    ? `وفر ${offer.discount_value}%`
    : `وفر ${offer.discount_value.toLocaleString('ar-IQ')} د.ع`
}

export function ItemCard({
  item,
  accentColor,
  themeMode,
  template,
  animationDelayMs = 0,
  offer,
  onSelect,
  isAvailable = true,
}: ItemCardProps) {
  const { addItem, decreaseQuantity, increaseQuantity, items } = useCartStore()
  const name = item.name_ar ?? item.name
  const description = item.description_ar ?? item.description
  const image = imageUrl(item.image_path)
  const cartItem = items.find(
    (cartLine) => cartLine.id === item.id && !cartLine.notes
  )
  const quantity = cartItem?.quantity ?? 0
  const { finalPrice, hasDiscount } = applyItemOffer(item.price, offer)
  const cardStyle = {
    animationDelay: `${animationDelayMs}ms`,
    '--menu-item-accent': accentColor,
  } as CSSProperties

  function addToCart() {
    if (!isAvailable) return
    addItem({
      id: item.id,
      name,
      price: finalPrice,
      imagePath: item.image_path,
    })
  }

  function quantityDown() {
    if (cartItem) decreaseQuantity(cartItem.lineId)
  }

  function quantityUp() {
    if (cartItem) increaseQuantity(cartItem.lineId)
    else addToCart()
  }

  return (
    <article
      className={cn(
        'menu-item-card',
        `menu-item-card--${template.cardLayout}`,
        `menu-item-card--${themeMode}`,
        !isAvailable && 'is-unavailable',
        template.animation !== 'none' && `menu-item-card--${template.animation}`
      )}
      style={cardStyle}
    >
      <button
        type='button'
        className='menu-item-card__details'
        onClick={onSelect}
        aria-label={`عرض تفاصيل ${name}`}
      >
        <div className='menu-item-card__media'>
          {image ? (
            <img src={image} alt={name} loading='lazy' />
          ) : (
            <span className='menu-item-card__placeholder' aria-hidden='true'>
              <UtensilsCrossed className='size-6' />
            </span>
          )}
          {offer && (
            <span className='menu-item-card__offer'>{offerLabel(offer)}</span>
          )}
          {item.is_bestseller && <span className='menu-item-card__offer'>🔥 الأكثر مبيعاً</span>}
          {!isAvailable && (
            <span className='menu-item-card__unavailable'>غير متوفر</span>
          )}
        </div>
        <div className='menu-item-card__copy'>
          <h3>{name}</h3>
          {description && <p>{description}</p>}
          <div className='menu-item-card__prices'>
            <strong>
              {finalPrice.toLocaleString('ar-IQ')} <small>د.ع</small>
            </strong>
            {hasDiscount && <del>{item.price.toLocaleString('ar-IQ')} د.ع</del>}
          </div>
        </div>
      </button>

      <div className='menu-item-card__action'>
        {quantity === 0 ? (
          <button
            type='button'
            className='menu-item-card__add'
            onClick={addToCart}
            disabled={!isAvailable}
          >
            <Plus className='size-4' /> <span>أضف</span>
          </button>
        ) : (
          <div
            className='menu-item-card__quantity'
            aria-label={`كمية ${name} في السلة`}
          >
            <button
              type='button'
              onClick={quantityDown}
              aria-label={`إنقاص كمية ${name}`}
            >
              <Minus className='size-3.5' />
            </button>
            <span>{quantity}</span>
            <button
              type='button'
              onClick={quantityUp}
              aria-label={`زيادة كمية ${name}`}
            >
              <Plus className='size-3.5' />
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
