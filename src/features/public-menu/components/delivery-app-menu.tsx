import { useMemo, useState, type CSSProperties } from 'react'
import { ChevronLeft, Menu, Search, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { getMenuImageUrl } from '@/lib/supabase'
import { useCartStore } from '@/stores/cart-store'
import {
  applyItemOffer,
  type PublicItemOffer,
  type PublicMenuCategory,
  type PublicMenuItem,
  type PublicRestaurant,
} from '../api'
import './delivery-app-menu.css'

interface DeliveryAppMenuProps {
  restaurant: PublicRestaurant
  restaurantName: string
  logoUrl: string | null
  heroImage: string | undefined
  bannerCount: number
  categories: PublicMenuCategory[]
  itemOffers: Record<string, PublicItemOffer>
  accentColor: string
  onSelectItem: (item: PublicMenuItem) => void
  onOpenCart: () => void
}

function imageUrl(path: string | null | undefined) {
  if (!path) return null
  return path.startsWith('https://') || path.startsWith('http://')
    ? path
    : getMenuImageUrl(path)
}

function categoryCover(category: PublicMenuCategory) {
  return imageUrl(category.items.find((item) => item.image_path)?.image_path)
}

export function DeliveryAppMenu({
  restaurant,
  restaurantName,
  logoUrl,
  heroImage,
  bannerCount,
  categories,
  itemOffers,
  accentColor,
  onSelectItem,
  onOpenCart,
}: DeliveryAppMenuProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '')
  const { addItem, items } = useCartStore()
  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId) ?? categories[0],
    [activeCategoryId, categories]
  )
  const cartCount = items.reduce((total, item) => total + item.quantity, 0)

  return (
    <div className='delivery-app-menu' style={{ '--delivery-accent': accentColor } as CSSProperties}>
      <header className='delivery-app-menu__topbar'>
        <button type='button' aria-label='القائمة'><Menu /></button>
        <span className='delivery-app-menu__delivery'>🛵 <b>توصيل</b><small>خلال 30 دقيقة</small></span>
        <div className='delivery-app-menu__top-actions'>
          <button type='button' aria-label='البحث'><Search /></button>
          <button type='button' onClick={onOpenCart} aria-label='السلة' className='delivery-app-menu__cart'>
            <ShoppingBag />{cartCount > 0 && <em>{cartCount}</em>}
          </button>
        </div>
      </header>

      <section className='delivery-app-menu__hero'>
        {heroImage ? <img src={heroImage} alt='' /> : <div className='delivery-app-menu__hero-placeholder'><UtensilsCrossed /></div>}
        <div className='delivery-app-menu__dots' aria-hidden='true'>
          {Array.from({ length: Math.max(2, bannerCount) }).slice(0, 4).map((_, index) => <i key={index} className={index === 0 ? 'is-active' : ''} />)}
        </div>
      </section>

      <section className='delivery-app-menu__identity'>
        <div className='delivery-app-menu__logo'>
          {logoUrl ? <img src={logoUrl} alt={`${restaurantName} — الشعار`} /> : <UtensilsCrossed />}
        </div>
        <div className='delivery-app-menu__restaurant-copy'>
          <h1>{restaurantName}</h1>
          <p>{restaurant.description || 'ألذ الأطباق تُجهّز خصيصًا لك'}</p>
        </div>
        <span className={restaurant.is_open ? 'delivery-app-menu__status is-open' : 'delivery-app-menu__status'}>
          {restaurant.is_open ? 'مفتوح' : 'مغلق'}
        </span>
      </section>

      <nav className='delivery-app-menu__categories' aria-label='أقسام المنيو'>
        <button type='button' className={!activeCategoryId ? 'is-active' : ''} onClick={() => setActiveCategoryId(categories[0]?.id ?? '')}>
          <span className='delivery-app-menu__category-icon'><Menu /></span><small>القائمة</small>
        </button>
        {categories.map((category) => {
          const cover = categoryCover(category)
          return <button key={category.id} type='button' className={activeCategory?.id === category.id ? 'is-active' : ''} onClick={() => setActiveCategoryId(category.id)}>
            <span className='delivery-app-menu__category-image'>{cover ? <img src={cover} alt='' /> : <UtensilsCrossed />}</span>
            <small>{category.name_ar ?? category.name}</small>
          </button>
        })}
      </nav>

      <main className='delivery-app-menu__content'>
        {activeCategory ? <>
          <div className='delivery-app-menu__section-title'>
            <div><small>تصفّح القسم</small><h2>{activeCategory.name_ar ?? activeCategory.name}</h2></div>
            <span>{activeCategory.items.length} أصناف</span>
          </div>
          <div className='delivery-app-menu__items'>
            {activeCategory.items.map((item, index) => {
              const offer = itemOffers[item.id]
              const { finalPrice, hasDiscount } = applyItemOffer(item.price, offer)
              const available = item.is_available && restaurant.is_open
              const image = imageUrl(item.image_path)
              const name = item.name_ar ?? item.name
              return <article key={item.id} className={!available ? 'is-unavailable' : ''}>
                <button type='button' className='delivery-app-menu__item-copy' onClick={() => onSelectItem(item)}>
                  <div>{(offer || index === 0) && <span className='delivery-app-menu__tag'>{offer ? 'عرض خاص' : 'الأكثر مبيعاً'}</span>}<h3>{name}</h3></div>
                  {item.description_ar || item.description ? <p>{item.description_ar ?? item.description}</p> : null}
                  <strong>{finalPrice.toLocaleString('ar-IQ')} <small>د.ع</small>{hasDiscount && <del>{item.price.toLocaleString('ar-IQ')}</del>}</strong>
                </button>
                <button type='button' className='delivery-app-menu__item-image' onClick={() => onSelectItem(item)} aria-label={`تفاصيل ${name}`}>
                  {image ? <img src={image} alt={name} /> : <UtensilsCrossed />}
                  {!available && <span>غير متوفر</span>}
                </button>
                <button type='button' className='delivery-app-menu__add' disabled={!available} onClick={() => addItem({ id: item.id, name, price: finalPrice, imagePath: item.image_path })}>
                  {available ? '+ أضف' : 'غير متوفر'}
                </button>
              </article>
            })}
          </div>
        </> : <div className='delivery-app-menu__empty'>لا توجد أصناف متاحة حاليًا.</div>}
      </main>

      <button type='button' className='delivery-app-menu__promo' onClick={onOpenCart}>
        <span>🎁 أضف {cartCount ? 'صنفًا آخر' : 'إلى السلة'} واحصل على عروض التوصيل</span><ChevronLeft />
      </button>
    </div>
  )
}
