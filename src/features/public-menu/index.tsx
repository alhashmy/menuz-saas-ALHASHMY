import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  Loader2,
  MapPin,
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
import { DeliveryAppMenu } from './components/delivery-app-menu'
import { FloatingCart } from './components/floating-cart'
import { ItemCard } from './components/item-card'
import { ItemDetailsSheet } from './components/item-details-sheet'
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

function SocialIcon({ name }: { name: 'whatsapp' | 'instagram' | 'facebook' | 'tiktok' | 'maps' | 'website' }) {
  const paths: Record<typeof name, string> = {
    whatsapp: 'M16.75 13.96c-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.57.13s-.65.81-.79.98c-.15.18-.29.2-.54.07a6.96 6.96 0 0 1-2.05-1.26 7.7 7.7 0 0 1-1.42-1.77c-.15-.25-.02-.38.11-.5.12-.12.25-.29.37-.43.12-.15.16-.25.25-.42.08-.17.04-.32-.02-.44-.06-.13-.57-1.37-.78-1.87-.21-.5-.42-.43-.57-.44h-.49c-.17 0-.44.06-.67.32-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.61c.13.17 1.77 2.7 4.28 3.78.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29M12 21a8.9 8.9 0 0 1-4.54-1.24L3 21l1.27-4.34A8.9 8.9 0 1 1 12 21m0-16.36a7.43 7.43 0 0 0-6.35 11.28l.18.29-.75 2.58 2.67-.7.28.17A7.43 7.43 0 1 0 12 4.64',
    instagram: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7m5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5m0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5M17.75 6a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 17.75 6',
    facebook: 'M14 8h3V4h-3c-2.76 0-5 2.24-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9c0-.55.45-1 1-1',
    tiktok: 'M14 3c.3 2.3 1.6 3.7 4 3.9v3.1c-1.5.1-2.8-.4-4-1.1v6.4c0 4.2-4.5 5.5-7.2 3.1-1.7-1.6-1.7-4.5.1-6.1.6-.6 1.5-1 2.5-1v3.2c-.7-.2-1.4.2-1.6.8-.2.7.2 1.4.8 1.6 1 .3 1.8-.5 1.8-1.4V3h3.6z',
    maps: 'M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5',
    website: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m6.9 6h-3.1a15.7 15.7 0 0 0-1.1-3.1A8.1 8.1 0 0 1 18.9 8M12 4c.8 1.1 1.5 2.5 1.8 4h-3.6c.3-1.5 1-2.9 1.8-4M4.3 14A8.4 8.4 0 0 1 4 12c0-.7.1-1.4.3-2h3.5a16.6 16.6 0 0 0 0 4H4.3m.8 2h3.1c.3 1.1.7 2.2 1.3 3.1A8.1 8.1 0 0 1 5.1 16m3.1-8H5.1a8.1 8.1 0 0 1 4.2-3.1A15.7 15.7 0 0 0 8.2 8M12 20c-.8-1.1-1.5-2.5-1.8-4h3.6c-.3 1.5-1 2.9-1.8 4m2.2-6h-4.4a14.5 14.5 0 0 1 0-4h4.4a14.5 14.5 0 0 1 0 4m.3 5.1c.6-.9 1-2 1.3-3.1h3.1a8.1 8.1 0 0 1-4.4 3.1M16.2 14a16.6 16.6 0 0 0 0-4h3.5c.2.6.3 1.3.3 2s-.1 1.4-.3 2h-3.5',
  }
  return <svg viewBox='0 0 24 24' aria-hidden='true' fill='currentColor'><path d={paths[name]} /></svg>
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
  const storedTemplateId =
    builderStyle?.menuTemplate ?? data?.branding?.menu_style
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
      .map((category) =>
        document.getElementById('menu-category-' + category.id)
      )
      .filter((element): element is HTMLElement => Boolean(element))
      .map(
        (element) =>
          new IntersectionObserver(
            ([entry]) => {
              if (entry?.isIntersecting)
                setActiveCategoryId(element.id.replace('menu-category-', ''))
            },
            { rootMargin: '-22% 0px -62% 0px', threshold: 0 }
          )
      )
    const elements = data.categories
      .map((category) =>
        document.getElementById('menu-category-' + category.id)
      )
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
    ? (categories.find((category) => category.id === modernCategoryId) ?? null)
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
  // روابط الإعدادات هي المصدر الأساسي، وتبقى روابط صانع المنيو المحفوظة
  // متاحة للقوائم القديمة حتى لا تختفي روابطها عند الترقية.
  const whatsappUrl = restaurant.whatsapp_number ?? builderStyle?.socialLinks?.whatsapp ?? null
  const instagramUrl = isSafeHttpUrl(restaurant.instagram_url ?? builderStyle?.socialLinks?.instagram)
  const facebookUrl = isSafeHttpUrl(restaurant.facebook_url ?? builderStyle?.socialLinks?.facebook)
  const tiktokUrl = isSafeHttpUrl(restaurant.tiktok_url ?? builderStyle?.socialLinks?.tiktok)
  const websiteUrl = isSafeHttpUrl(restaurant.website_url)
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
    <aside
      className='public-menu__social-rail'
      aria-label='وسائل التواصل والموقع'
    >
      {mapUrl && (
        <a
          href={mapUrl}
          target='_blank'
          rel='noopener noreferrer'
          aria-label='موقع المطعم'
        >
          <SocialIcon name='maps' />
        </a>
      )}
      {whatsappUrl && (
          <a
            href={
              whatsappUrl.startsWith('http') ? whatsappUrl : 'https://wa.me/' + whatsappUrl.replace(/\D/g, '')
            }
            target='_blank'
            rel='noopener noreferrer'
            aria-label='واتساب'
          >
            <SocialIcon name='whatsapp' />
          </a>
        )}
      {instagramUrl && (
          <a
            href={instagramUrl}
            target='_blank'
            rel='noopener noreferrer'
            aria-label='إنستغرام'
          >
            <SocialIcon name='instagram' />
          </a>
        )}
      {facebookUrl && (
          <a
            href={facebookUrl}
            target='_blank'
            rel='noopener noreferrer'
            aria-label='فيسبوك'
          >
            <SocialIcon name='facebook' />
          </a>
        )}
      {tiktokUrl && (
          <a
            href={tiktokUrl}
            target='_blank'
            rel='noopener noreferrer'
            aria-label='تيك توك'
          >
            <SocialIcon name='tiktok' />
          </a>
        )}
      {websiteUrl && (
        <a href={websiteUrl} target='_blank' rel='noopener noreferrer' aria-label='الموقع الإلكتروني'>
          <SocialIcon name='website' />
        </a>
      )}
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
          socialRail={socialRail}
        />
        {builderStyle?.neonLineEnabled && (
          <>
            <div
              className='public-menu__neon-line public-menu__neon-line--top'
              aria-hidden='true'
            />
            <div
              className='public-menu__neon-line public-menu__neon-line--bottom'
              aria-hidden='true'
            />
          </>
        )}
        {builderStyle?.entryAdEnabled && entryAdOpen && (
          <div
            className='entry-ad'
            role='dialog'
            aria-modal='true'
            aria-label='إعلان'
          >
            <button
              type='button'
              className='entry-ad__backdrop'
              onClick={() => setEntryAdOpen(false)}
              aria-label='إغلاق الإعلان'
            />
            <section className='entry-ad__card'>
              <button
                type='button'
                className='entry-ad__close'
                onClick={() => setEntryAdOpen(false)}
                aria-label='إغلاق'
              >
                ×
              </button>
              {builderStyle.entryAdImageUrl && (
                <img
                  src={builderStyle.entryAdImageUrl}
                  alt=''
                  className='entry-ad__image'
                />
              )}
              <div className='entry-ad__body'>
                {builderStyle.entryAdTitle && (
                  <h2>{builderStyle.entryAdTitle}</h2>
                )}
                {builderStyle.entryAdMessage && (
                  <p>{builderStyle.entryAdMessage}</p>
                )}
                <button type='button' onClick={() => setEntryAdOpen(false)}>
                  إغلاق
                </button>
              </div>
            </section>
          </div>
        )}
        <ItemDetailsSheet
          key={selectedItem?.id ?? 'empty-item'}
          item={selectedItem}
          accentColor={accentColor}
          offer={selectedItem ? data.itemOffers[selectedItem.id] : undefined}
          isAvailable={Boolean(
            selectedItem?.is_available && restaurant.is_open
          )}
          themeMode='light'
          onOpenChange={(open) => {
            if (!open) setSelectedItem(null)
          }}
        />
        <FloatingCart
          accentColor={accentColor}
          isLight
          open={cartOpen}
          onOpenChange={setCartOpen}
          cartCount={cartCount}
          restaurantId={restaurant.id}
          restaurantIsOpen={restaurant.is_open}
          operatingHours={data.operatingHours}
          restaurantName={restaurantName}
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
      {socialRail}
      {builderStyle?.neonLineEnabled && (
        <>
          <div
            className='public-menu__neon-line public-menu__neon-line--top'
            aria-hidden='true'
          />
          <div
            className='public-menu__neon-line public-menu__neon-line--bottom'
            aria-hidden='true'
          />
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
                const cover = category.items.find(
                  (item) => item.image_path
                )?.image_path
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
                    {cover ? (
                      <img src={menuImageUrl(cover) ?? undefined} alt='' />
                    ) : (
                      <UtensilsCrossed className='size-8' />
                    )}
                    <span className='modern-menu__category-shade' />
                    <span className='modern-menu__category-copy'>
                      <strong>{category.name_ar ?? category.name}</strong>
                      <small>
                        {category.items.length}{' '}
                        {category.items.length === 1 ? 'صنف' : 'أصناف'}
                      </small>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className='space-y-10'>
            {(selectedModernCategory
              ? [selectedModernCategory]
              : categories
            ).map((category, categoryIndex) => (
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

      {builderStyle?.entryAdEnabled && entryAdOpen && (
        <div
          className='entry-ad'
          role='dialog'
          aria-modal='true'
          aria-label='إعلان'
        >
          <button
            type='button'
            className='entry-ad__backdrop'
            onClick={() => setEntryAdOpen(false)}
            aria-label='إغلاق الإعلان'
          />
          <section className='entry-ad__card'>
            <button
              type='button'
              className='entry-ad__close'
              onClick={() => setEntryAdOpen(false)}
              aria-label='إغلاق'
            >
              ×
            </button>
            {builderStyle.entryAdImageUrl && (
              <img
                src={builderStyle.entryAdImageUrl}
                alt=''
                className='entry-ad__image'
              />
            )}
            <div className='entry-ad__body'>
              {builderStyle.entryAdTitle && (
                <h2>{builderStyle.entryAdTitle}</h2>
              )}
              {builderStyle.entryAdMessage && (
                <p>{builderStyle.entryAdMessage}</p>
              )}
              <button type='button' onClick={() => setEntryAdOpen(false)}>
                إغلاق
              </button>
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
        restaurantIsOpen={restaurant.is_open}
        operatingHours={data.operatingHours}
        restaurantName={restaurantName}
      />
    </div>
  )
}
