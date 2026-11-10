import { useEffect, useMemo, useState } from 'react'
import { Loader2, SearchX, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { usePublicMenu, type PublicMenuItem } from './api'
import { getMenuImageUrl } from '@/lib/supabase'
import { useCartStore } from '@/stores/cart-store'
import { CategoryTabsBar } from './components/category-tabs-bar'
import { ItemCard } from './components/item-card'
import { ItemDetailsSheet } from './components/item-details-sheet'
import { PromoBanner } from './components/promo-banner'
import { CartSheet } from './components/cart-sheet'
import { getMenuTemplate } from './templates/registry'

interface PublicMenuProps {
  restaurantSlug: string
}

export function PublicMenu({ restaurantSlug }: PublicMenuProps) {
  const { data, isLoading, isError } = usePublicMenu(restaurantSlug)
  const [activeCategoryId, setActiveCategoryId] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<PublicMenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const { items } = useCartStore()
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0)
  const [bannerIndex, setBannerIndex] = useState(0)
  const bannerUrls = data?.branding?.style?.bannerUrls ?? []

  useEffect(() => {
    if (bannerUrls.length <= 1) return
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % bannerUrls.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [bannerUrls.length])

  const template = getMenuTemplate(data?.branding?.menu_style)

  useEffect(() => {
    if (data?.categories.length && !activeCategoryId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- مزامنة أول قسم نشط بعد وصول بيانات الاستعلام
      setActiveCategoryId(data.categories[0].id)
    }
  }, [data, activeCategoryId])

  // يحدّد الوضع الداكن/الفاتح: القالب قد يفرض وضعاً معيناً، وإلا يُستخدم إعداد المطعم
  const themeMode = data?.branding?.theme_mode ?? 'dark'
  const isDark = useMemo(() => {
    if (template.forceDark) return true
    if (template.forceLight) return false
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return themeMode !== 'light'
  }, [themeMode, template])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
  }, [isDark])

  function handleSelectCategory(id: string) {
    setActiveCategoryId(id)
    const el = document.getElementById(`category-${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (isLoading) {
    return (
      <div className='flex h-svh items-center justify-center bg-background'>
        <Loader2 className='size-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className='flex h-svh flex-col items-center justify-center gap-3 bg-background text-center'>
        <SearchX className='size-10 text-muted-foreground' />
        <p className='text-lg font-semibold'>لم يتم العثور على هذا المطعم</p>
        <p className='text-sm text-muted-foreground'>
          تأكد من صحة رابط القائمة أو رمز QR الممسوح.
        </p>
      </div>
    )
  }

  const accentColor = data.branding?.style?.accentColor ?? data.branding?.accent_color ?? template.previewAccent

  const logoUrl = getMenuImageUrl(data.branding?.logo_path)
  const restaurantName = data.restaurant.name_ar ?? data.restaurant.name
  const hasBanners = bannerUrls.length > 0

  const builderStyle = data.branding?.style
  const neonEnabled = builderStyle?.neonEnabled ?? false
  const neonColor = builderStyle?.neonColor ?? '#22d3ee'
  const backgroundColor = builderStyle?.backgroundColor ?? '#0b0f19'
  const layout = builderStyle?.layout ?? 'list'

  const itemsContainerClass = {
    list: 'grid grid-cols-1 gap-6',
    'grid-2': 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
    'grid-3': 'grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6',
    cards: 'grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  }[layout] ?? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'

  return (
    <div
      dir='rtl'
      className='min-h-svh bg-background pb-10 text-foreground'
      style={{ fontFamily: template.fontFamily }}
    >
      {/* اللوحة الإعلانية - سلايدر تلقائي في أعلى الشاشة (أول عنصر في الـ DOM) */}
      {(bannerUrls || []).length > 0 && (
        <div className='relative w-full aspect-[16/9] max-h-[240px] overflow-hidden rounded-b-3xl'>
          <img
            src={bannerUrls[bannerIndex]}
            alt='اللوحة الإعلانية'
            className='w-full h-full object-cover'
          />
          {(bannerUrls || []).length > 1 && (
            <div className='absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5'>
              {(bannerUrls || []).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBannerIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    i === bannerIndex ? 'bg-emerald-500' : 'bg-white/40'
                  }`}
                  aria-label={`الإعلان ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className={cn('max-w-7xl mx-auto w-full relative z-10 px-4', neonEnabled && 'neon-frame')} style={{ '--neon-glow': neonColor, '--bg': 'var(--background)', backgroundColor }}>
        {/* بطاقة تعريف المطعم المتداخلة مع حافة الإعلان السفلية */}
        <div className={cn('relative px-4 z-20', hasBanners ? 'pt-4' : 'pt-8 pb-2')}>
          <div className='flex flex-col items-center justify-center text-center pt-4 pb-2 px-4'>
            <div className='w-20 h-20 rounded-2xl border-2 border-slate-700 bg-slate-800 shadow-xl overflow-hidden mb-2 flex-shrink-0'>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={restaurantName}
                  className='w-full h-full object-cover'
                />
              ) : (
                <div className='flex w-full h-full items-center justify-center bg-slate-800 text-slate-400'>
                  <UtensilsCrossed className='size-8 md:size-10' />
                </div>
              )}
            </div>
            <h1 className='mt-1.5 text-lg font-bold text-white text-center truncate'>
              {restaurantName}
            </h1>
            <p className='text-xs text-slate-400 mt-1 truncate'>تصفح المنيو واطلب الآن</p>
          </div>
        </div>

        <div className='mb-6' />

        {/* شريط الأقسام الملتصق في الأعلى */}
        <CategoryTabsBar
          categories={data.categories}
          activeId={activeCategoryId}
          accentColor={accentColor}
          template={template}
          onSelect={handleSelectCategory}
        />

        <PromoBanner offers={data.orderOffers} accentColor={accentColor} />

        {data.categories.length === 0 ? (
          <div className='flex flex-col items-center gap-2 px-4 py-16 text-center text-muted-foreground'>
            <SearchX className='size-8' />
            <p>لا توجد أصناف متاحة حالياً في هذه القائمة.</p>
          </div>
        ) : (
          <main className='space-y-8 px-4 pb-24'>
              {data.categories.map((category) => (
                <section
                  key={category.id}
                  id={`category-${category.id}`}
                  className='scroll-mt-20 relative'
              >
                <h2
                  className={cn(template.ornamented && 'flex items-center gap-2')}
                >
                  {template.ornamented && (
                    <span className='h-px flex-1 max-w-6' style={{ backgroundColor: accentColor }} />
                  )}
                  {category.name_ar ?? category.name}
                  {template.ornamented && (
                    <span className='h-px flex-1' style={{ backgroundColor: accentColor }} />
                  )}
                </h2>
                    <div className={itemsContainerClass}>
                      {category.items.map((item, idx) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          accentColor={accentColor}
                          template={template}
                          animationDelayMs={idx * 70}
                          offer={data.itemOffers[item.id]}
                          isAvailable={item.is_available}
                          onSelect={() => setSelectedItem(item)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </main>
        )}
      </div>

      <ItemDetailsSheet
        item={selectedItem}
        accentColor={accentColor}
        offer={selectedItem ? data.itemOffers[selectedItem.id] : undefined}
        isAvailable={selectedItem?.is_available}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      />

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        restaurantId={data?.restaurant.id}
      />

      {/* زر السلة العائم ثابت في أسفل الشاشة */}
      <Button
        type='button'
        variant='outline'
        className='fixed bottom-8 right-8 z-50 text-white border-white/40 hover:bg-white/20 shadow-xl'
        onClick={() => setCartOpen((open) => !open)}
      >
        <ShoppingCart className='size-4 mr-1' />
        سلة ({cartCount})
      </Button>
    </div>
  )
}
