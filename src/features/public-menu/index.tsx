import { useEffect, useMemo, useState } from 'react'
import { Loader2, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePublicMenu, type PublicMenuItem } from './api'
import { PublicMenuHeader } from './components/public-menu-header'
import { CategoryTabsBar } from './components/category-tabs-bar'
import { ItemCard } from './components/item-card'
import { ItemDetailsSheet } from './components/item-details-sheet'
import { PromoBanner } from './components/promo-banner'
import { getMenuTemplate } from './templates/registry'

interface PublicMenuProps {
  restaurantSlug: string
}

export function PublicMenu({ restaurantSlug }: PublicMenuProps) {
  const { data, isLoading, isError } = usePublicMenu(restaurantSlug)
  const [activeCategoryId, setActiveCategoryId] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<PublicMenuItem | null>(null)

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

  const primaryColor = data.branding?.primary_color ?? template.previewPrimary
  const accentColor = data.branding?.accent_color ?? template.previewAccent

  const itemsContainerClass =
    template.cardLayout === 'grid' || template.cardLayout === 'overlay'
      ? 'grid grid-cols-2 gap-3'
      : 'grid gap-3'

  return (
    <div
      dir='rtl'
      className='min-h-svh bg-background pb-10 text-foreground'
      style={{ fontFamily: template.fontFamily }}
    >
      <PublicMenuHeader
        restaurant={data.restaurant}
        branding={data.branding}
        template={template}
        primaryColor={primaryColor}
      />

      <PromoBanner offers={data.orderOffers} accentColor={accentColor} />

      {data.categories.length === 0 ? (
        <div className='flex flex-col items-center gap-2 px-4 py-16 text-center text-muted-foreground'>
          <SearchX className='size-8' />
          <p>لا توجد أصناف متاحة حالياً في هذه القائمة.</p>
        </div>
      ) : (
        <>
          <CategoryTabsBar
            categories={data.categories}
            activeId={activeCategoryId}
            accentColor={accentColor}
            template={template}
            onSelect={handleSelectCategory}
          />

          <main className='space-y-8 px-4 pt-4'>
            {data.categories.map((category) => (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className='scroll-mt-20'
              >
                <h2
                  className={cn(
                    'mb-3 text-base font-bold',
                    template.ornamented && 'flex items-center gap-2'
                  )}
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
                      onSelect={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </main>
        </>
      )}

      <ItemDetailsSheet
        item={selectedItem}
        accentColor={accentColor}
        offer={selectedItem ? data.itemOffers[selectedItem.id] : undefined}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      />
    </div>
  )
}
