import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  Loader2,
  MapPin,
  MessageCircle,
  Music2,
  AtSign,
  Share2,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { getMenuImageUrl } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { type PublicMenuItem, usePublicMenu } from './api'
import { CategoryTabsBar } from './components/category-tabs-bar'
import { FloatingCart } from './components/floating-cart'
import { ItemCard } from './components/item-card'
import { ItemDetailsSheet } from './components/item-details-sheet'
import { PromoBanner } from './components/promo-banner'
import { DeliveryAppMenu } from './components/delivery-app-menu'
import './public-menu.css'
import { getMenuTemplate } from './templates/registry'

interface PublicMenuProps {
  restaurantSlug: string
}

function isSafeHttpUrl(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : null
  } catch {
    return null
  }
}

function menuImageUrl(path: string | null | undefined) {
  if (!path) return null
  return path.startsWith('https://') || path.startsWith('http://')
    ? path
    : getMenuImageUrl(path)
}

export function PublicMenu({ restaurantSlug }: PublicMenuProps) {
  const { data, isLoading, isError } = usePublicMenu(restaurantSlug)
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [selectedItem, setSelectedItem] = useState<PublicMenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [bannerIndex, setBannerIndex] = useState(0)
  const [entryAdOpen, setEntryAdOpen] = useState(true)
  const [modernCategoryId, setModernCategoryId] = useState<string | null>(null)
  const initializedRestaurantId = useRef<string | null>(null)
  const { items: cartItems, clear } = useCartStore()

  const builderStyle = data?.branding?.style
  const storedTemplateId = builderStyle?.menuTemplate ?? data?.branding?.menu_style
  // نسخة دليفري القديمة حفظت عند بعض القوائم بخلفية سوداء رغم الوضع الفاتح.
  // نعرضها بالقالب البديل السليم كي لا يحصل تباين أسود على أسود عند الزبون.
  const isBrokenLegacyDelivery =
    storedTemplateId === 'delivery' &&
    builderStyle?.themeMode === 'light' &&
    (builderStyle.backgroundColor === '#000000' ||
      builderStyle.secondaryColor === '#000000')
  const template = getMenuTemplate(
    isBrokenLegacyDelivery ? 'delivery-app' : storedTemplateId
  )
  const themeMode =
    builderStyle?.themeMode ?? data?.branding?.theme_mode ?? 'light'
  const isDark =
    template.forceDark || (!template.forceLight && themeMode === 'dark')
  const isLight = !isDark
  const accentColor = isBrokenLegacyDelivery
    ? template.previewAccent
    : (builderStyle?.accentColor ?? template.previewAccent)
  const secondaryColor = isBrokenLegacyDelivery
    ? '#fff3eb'
    : (builderStyle?.secondaryColor ?? template.previewPrimary)
  const gradientAngle = builderStyle?.gradientAngle ?? 135
  const bannerUrls = (builderStyle?.bannerUrls ?? []).filter((url) =>
    isSafeHttpUrl(url)
  )
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0)

  useEffect(() => {
    if (!data?.restaurant.id) return
    if (
      initializedRestaurantId.current &&
      initializedRestaurantId.current !== data.restaurant.id
    ) {
      clear()
    }
    initializedRestaurantId.current = data.restaurant.id
  }, [clear, data?.restaurant.id])

  useEffect(() => {
    if (bannerUrls.length <= 1) return
    const timer = window.setInterval(() => {
      setBannerIndex((previous) => (previous + 1) % bannerUrls.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [bannerUrls.length])

  useEffect(() => {
    if (template.id === 'modern' || !data?.categories.length) return
    const observers = data.categories
      .map((category) => document.getElementById('menu-category-' + category.id))
      .filter((element): element is HTMLElement => Boolean(element))
      .map((element) =>
        new IntersectionObserver(
          ([entry]) => {
            if (entry?.isIntersecting) setActiveCategoryId(element.id.replace('menu-category-', ''))
          },
          { rootMargin: '-22% 0px -62% 0px', threshold: 0 }
        )
      )
    const elements = data.categories
      .map((category) => document.getElementById('menu-category-' + category.id))
      .filter((element): element is HTMLElement => Boolean(element))
    observers.forEach((observer, index) => observer.observe(elements[index]))
    return () => observers.forEach((observer) => observer.disconnect())
  }, [data?.categories, template.id])

  const categories = useMemo(() => {
    if (!data) return []
    const normalizedQuery = query.trim().toLocaleLowerCase('ar-IQ')
    if (!normalizedQuery) return data.categories

    return data.categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const searchable = [
            item.name,
            item.name_ar,
            item.description,
            item.description_ar,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('ar-IQ')
          return searchable.includes(normalizedQuery)
        }),
      }))
      .filter((category) => category.items.length > 0)
  }, [data, query])

  const visibleActiveCategoryId = categories.some(
    (category) => category.id === activeCategoryId
  )
    ? activeCategoryId
    : (categories[0]?.id ?? '')
  const isModernMenu = template.id === 'modern'
  const selectedModernCategory = isModernMenu
    ? categories.find((category) => category.id === modernCategoryId) ?? null
    : null

  function selectCategory(categoryId: string) {
    setActiveCategoryId(categoryId)
    document.getElementById(`menu-category-${categoryId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  if (isLoading) {
    return (
      <div
        dir='rtl'
        className='flex min-h-svh items-center justify-center bg-[#f8f7f4] text-slate-900'
      >
        <div className='flex flex-col items-center gap-3 text-sm text-slate-500'>
          <Loader2 className='size-7 animate-spin text-slate-900' />
          نجهّز المنيو لك…
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div
        dir='rtl'
        className='flex min-h-svh flex-col items-center justify-center gap-3 bg-[#f8f7f4] px-6 text-center text-slate-900'
      >
        <div className='flex size-16 items-center justify-center rounded-[1.5rem] bg-white shadow-sm'>
          <Search className='size-7 text-slate-400' />
        </div>
        <p className='text-lg font-bold'>لم نجد هذا المطعم</p>
        <p className='max-w-xs text-sm leading-6 text-slate-500'>
          تأكد من الرابط أو امسح رمز QR مرة أخرى.
        </p>
      </div>
    )
  }

  const restaurant = data.restaurant
  const restaurantName = restaurant.name_ar ?? restaurant.name
  const logoUrl = getMenuImageUrl(data.branding?.logo_path)
  const heroImage = bannerUrls[bannerIndex]
  const mapUrl =
    isSafeHttpUrl(restaurant.google_maps_url) ??
    isSafeHttpUrl(restaurant.waze_url)
  const menuStyle = {
    '--menu-accent': accentColor,
    '--menu-primary': template.previewPrimary,
    '--menu-secondary': secondaryColor,
    '--menu-gradient-angle': gradientAngle + 'deg',
    '--menu-background': isBrokenLegacyDelivery
      ? '#fffaf7'
      : (builderStyle?.backgroundColor ?? (isDark ? '#101112' : '#fffdf9')),
  } as CSSProperties
  const layoutClass =
    template.cardLayout === 'grid'
      ? 'grid grid-cols-2 gap-3 sm:grid-cols-3'
      : template.cardLayout === 'overlay'
        ? 'grid gap-4 sm:grid-cols-2'
        : 'grid gap-3'
  const socialRail = (
    <aside className='public-menu__social-rail' aria-label='وسائل التواصل والموقع'>
      {mapUrl && <a href={mapUrl} target='_blank' rel='noopener noreferrer' aria-label='موقع المطعم'><MapPin /></a>}
      {builderStyle?.socialVisibility?.whatsapp && builderStyle.socialLinks?.whatsapp && <a href={builderStyle.socialLinks.whatsapp.startsWith('http') ? builderStyle.socialLinks.whatsapp : 'https://wa.me/' + builderStyle.socialLinks.whatsapp.replace(/\D/g, '')} target='_blank' rel='noopener noreferrer' aria-label='واتساب'><MessageCircle /></a>}
      {builderStyle?.socialVisibility?.instagram && builderStyle.socialLinks?.instagram && <a href={builderStyle.socialLinks.instagram} target='_blank' rel='noopener noreferrer' aria-label='إنستغرام'><AtSign /></a>}
      {builderStyle?.socialVisibility?.facebook && builderStyle.socialLinks?.facebook && <a href={builderStyle.socialLinks.facebook} target='_blank' rel='noopener noreferrer' aria-label='فيسبوك'><Share2 /></a>}
      {builderStyle?.socialVisibility?.tiktok && builderStyle.socialLinks?.tiktok && <a href={builderStyle.socialLinks.tiktok} target='_blank' rel='noopener noreferrer' aria-label='تيك توك'><Music2 /></a>}
    </aside>
  )

  if (template.id === 'delivery-app') {
    return (
      <div
        dir='rtl'
        data-menu-template={template.id}
        className='public-menu public-menu--light min-h-svh'
        style={{ ...menuStyle, fontFamily: template.fontFamily }}
      >
        <DeliveryAppMenu
          restaurant={restaurant}
          restaurantName={restaurantName}
          logoUrl={logoUrl}
          heroImage={heroImage}
          bannerCount={bannerUrls.length}
          categories={categories}
          itemOffers={data.itemOffers}
          accentColor={accentColor}
          onSelectItem={setSelectedItem}
          onOpenCart={() => setCartOpen(true)}
        />
        {socialRail}
        {builderStyle?.neonLineEnabled && (
          <>
            <div className='public-menu__neon-line public-menu__neon-line--top' aria-hidden='true' />
            <div className='public-menu__neon-line public-menu__neon-line--bottom' aria-hidden='true' />
          </>
        )}
        {builderStyle?.entryAdEnabled && entryAdOpen && (
          <div className='entry-ad' role='dialog' aria-modal='true' aria-label='إعلان'>
            <button type='button' className='entry-ad__backdrop' onClick={() => setEntryAdOpen(false)} aria-label='إغلاق الإعلان' />
            <section className='entry-ad__card'>
              <button type='button' className='entry-ad__close' onClick={() => setEntryAdOpen(false)} aria-label='إغلاق'>×</button>
              {builderStyle.entryAdImageUrl && <img src={builderStyle.entryAdImageUrl} alt='' className='entry-ad__image' />}
              <div className='entry-ad__body'>
                {builderStyle.entryAdTitle && <h2>{builderStyle.entryAdTitle}</h2>}
                {builderStyle.entryAdMessage && <p>{builderStyle.entryAdMessage}</p>}
                <button type='button' onClick={() => setEntryAdOpen(false)}>إغلاق</button>
              </div>
            </section>
          </div>
        )}
        <ItemDetailsSheet
          key={selectedItem?.id ?? 'empty-item'}
          item={selectedItem}
          accentColor={accentColor}
          offer={selectedItem ? data.itemOffers[selectedItem.id] : undefined}
          isAvailable={Boolean(selectedItem?.is_available && restaurant.is_open)}
          themeMode='light'
          onOpenChange={(open) => { if (!open) setSelectedItem(null) }}
        />
        <FloatingCart
          accentColor={accentColor}
          isLight
          open={cartOpen}
          onOpenChange={setCartOpen}
          cartCount={cartCount}
          restaurantId={restaurant.id}
        />
      </div>
    )
  }

  return (
    <div
      dir='rtl'
      data-menu-template={template.id}
      className={cn(
        'public-menu min-h-svh pb-28',
        isDark ? 'public-menu--dark' : 'public-menu--light'
      )}
      style={{ ...menuStyle, fontFamily: template.fontFamily }}
    >
      <header className='public-menu__hero'>
        {heroImage ? (
          <img
            src={heroImage}
            alt=''
            className='public-menu__hero-image'
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        <div className='public-menu__hero-glow' />
        <div className='relative mx-auto max-w-5xl px-4 pt-5 pb-9 sm:px-6'>
          <div className='flex items-center justify-between gap-3'>
            <button
              type='button'
              onClick={() => setSearchOpen((open) => !open)}
              className='public-menu__icon-button'
              aria-label={searchOpen ? 'إغلاق البحث' : 'البحث في المنيو'}
              aria-expanded={searchOpen}
            >
              {searchOpen ? (
                <X className='size-4' />
              ) : (
                <Search className='size-4' />
              )}
            </button>
            <button
              type='button'
              onClick={() => setCartOpen(true)}
              className='public-menu__cart-button'
              aria-label='عرض السلة'
            >
              <ShoppingBag className='size-4' />
              {cartCount > 0 && <span>{cartCount}</span>}
            </button>
          </div>

          {searchOpen && (
            <div className='mt-5 animate-in duration-200 fade-in slide-in-from-top-2'>
              <label className='public-menu__search-field'>
                <Search className='size-4' />
                <Input
                  autoFocus
                  type='search'
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value.slice(0, 80))
                  }
                  placeholder='ابحث عن طبق أو مكوّن…'
                  aria-label='البحث في المنيو'
                  maxLength={80}
                />
              </label>
            </div>
          )}

          <div className='public-menu__identity'>
            <div className='public-menu__logo'>
              {logoUrl ? (
                <img src={logoUrl} alt={`${restaurantName} — الشعار`} />
              ) : (
                <UtensilsCrossed className='size-7' />
              )}
            </div>
            <div className='min-w-0 flex-1'>
              <div className='mb-2 flex flex-wrap items-center gap-2'>
                <span
                  className={cn(
                    'public-menu__status',
                    restaurant.is_open ? 'is-open' : 'is-closed'
                  )}
                >
                  <i /> {restaurant.is_open ? 'مفتوح الآن' : 'مغلق حاليًا'}
                </span>
                <span className='public-menu__eyebrow'>منيو رقمي</span>
              </div>
              <h1>{restaurantName}</h1>
              {restaurant.description && <p>{restaurant.description}</p>}
            </div>
            {mapUrl && (
              <a
                className='public-menu__map-link'
                href={mapUrl}
                target='_blank'
                rel='noopener noreferrer'
              >
                <MapPin className='size-4' />
                <span>الموقع</span>
              </a>
            )}
          </div>

          {bannerUrls.length > 1 && (
            <div className='public-menu__hero-dots' aria-label='الإعلانات'>
              {bannerUrls.map((url, index) => (
                <button
                  key={url}
                  type='button'
                  aria-label={`عرض الإعلان ${index + 1}`}
                  aria-current={index === bannerIndex}
                  className={index === bannerIndex ? 'is-active' : ''}
                  onClick={() => setBannerIndex(index)}
                />
              ))}
            </div>
          )}
        </div>
      </header>
      {builderStyle?.neonLineEnabled && (
        <>
          <div className='public-menu__neon-line public-menu__neon-line--top' aria-hidden='true' />
          <div className='public-menu__neon-line public-menu__neon-line--bottom' aria-hidden='true' />
        </>
      )}

      {!isModernMenu && (
        <CategoryTabsBar
          categories={categories}
          activeId={visibleActiveCategoryId}
          accentColor={accentColor}
          template={template}
          isLight={isLight}
          onSelect={selectCategory}
        />
      )}

      <PromoBanner offers={data.orderOffers} accentColor={accentColor} />

      <main className='mx-auto max-w-5xl px-4 pt-6 sm:px-6'>
        {query && (
          <div className='mb-5 flex items-center justify-between gap-3 text-sm'>
            <p className='public-menu__search-summary'>
              نتائج البحث عن «{query}»
            </p>
            <button
              type='button'
              onClick={() => setQuery('')}
              className='public-menu__clear-search'
            >
              مسح
            </button>
          </div>
        )}

        {categories.length === 0 ? (
          <div className='public-menu__empty-state'>
            <Search className='size-6' />
            <h2>ما لقينا نتائج</h2>
            <p>جرّب اسمًا آخر أو تصفّح الأقسام.</p>
          </div>
        ) : isModernMenu && !selectedModernCategory ? (
          <div className='modern-menu__intro'>
            <p>اختر القسم الذي تريد الطلب منه</p>
            <div className='modern-menu__categories'>
              {categories.map((category) => {
                const cover = category.items.find((item) => item.image_path)?.image_path
                return (
                  <button
                    key={category.id}
                    type='button'
                    className='modern-menu__category-card'
                    onClick={() => {
                      setModernCategoryId(category.id)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    {cover ? <img src={menuImageUrl(cover) ?? undefined} alt='' /> : <UtensilsCrossed className='size-8' />}
                    <span className='modern-menu__category-shade' />
                    <span className='modern-menu__category-copy'>
                      <strong>{category.name_ar ?? category.name}</strong>
                      <small>{category.items.length} {category.items.length === 1 ? 'صنف' : 'أصناف'}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className='space-y-10'>
            {(selectedModernCategory ? [selectedModernCategory] : categories).map((category, categoryIndex) => (
              <section
                key={category.id}
                id={`menu-category-${category.id}`}
                className='scroll-mt-28'
              >
                {isModernMenu && (
                  <button
                    type='button'
                    className='modern-menu__back'
                    onClick={() => setModernCategoryId(null)}
                  >
                    ← العودة إلى الأقسام
                  </button>
                )}
                <div className='public-menu__section-heading'>
                  <div>
                    <span>{String(categoryIndex + 1).padStart(2, '0')}</span>
                    <h2>{category.name_ar ?? category.name}</h2>
                  </div>
                  <p>
                    {category.items.length}{' '}
                    {category.items.length === 1 ? 'صنف' : 'أصناف'}
                  </p>
                </div>
                <div className={layoutClass}>
                  {category.items.map((item, itemIndex) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      accentColor={accentColor}
                      themeMode={isDark ? 'dark' : 'light'}
                      template={template}
                      offer={data.itemOffers[item.id]}
                      isAvailable={item.is_available && restaurant.is_open}
                      animationDelayMs={Math.min(itemIndex * 45, 300)}
                      onSelect={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className='public-menu__footer'>
        <Store className='size-4' />
        <span>طلبك يُراجع مباشرة من المطعم</span>
        <Sparkles className='size-3.5' />
      </footer>
      {socialRail}

      {builderStyle?.entryAdEnabled && entryAdOpen && (
        <div className='entry-ad' role='dialog' aria-modal='true' aria-label='إعلان'>
          <button type='button' className='entry-ad__backdrop' onClick={() => setEntryAdOpen(false)} aria-label='إغلاق الإعلان' />
          <section className='entry-ad__card'>
            <button type='button' className='entry-ad__close' onClick={() => setEntryAdOpen(false)} aria-label='إغلاق'>×</button>
            {builderStyle.entryAdImageUrl && <img src={builderStyle.entryAdImageUrl} alt='' className='entry-ad__image' />}
            <div className='entry-ad__body'>
              {builderStyle.entryAdTitle && <h2>{builderStyle.entryAdTitle}</h2>}
              {builderStyle.entryAdMessage && <p>{builderStyle.entryAdMessage}</p>}
              <button type='button' onClick={() => setEntryAdOpen(false)}>إغلاق</button>
            </div>
          </section>
        </div>
      )}

      <ItemDetailsSheet
        key={selectedItem?.id ?? 'empty-item'}
        item={selectedItem}
        accentColor={accentColor}
        offer={selectedItem ? data.itemOffers[selectedItem.id] : undefined}
        isAvailable={Boolean(selectedItem?.is_available && restaurant.is_open)}
        themeMode={isDark ? 'dark' : 'light'}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null)
        }}
      />
      <FloatingCart
        accentColor={accentColor}
        isLight={isLight}
        open={cartOpen}
        onOpenChange={setCartOpen}
        cartCount={cartCount}
        restaurantId={restaurant.id}
      />
    </div>
  )
}
