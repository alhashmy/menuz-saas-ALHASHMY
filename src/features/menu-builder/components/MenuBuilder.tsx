'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CircleCheck,
  ClipboardList,
  Loader2,
  PackageOpen,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getMenuImageUrl, supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { LanguageToggle } from '@/components/language-toggle'
import { useLanguage } from '@/i18n'
import { useMenuBuilderStore } from '../store'
import type { MenuStyle } from '../types'
import { FloatingToolbar, MENU_THEMES } from './FloatingToolbar'
import { OperationsSettings } from './OperationsSettings'

export function MenuBuilder() {
  const { language, direction } = useLanguage()
  const {
    categories,
    items,
    setContext,
    setRestaurantDescription,
    setRestaurantLogoUrl,
    setMenuStyle,
    load,
    style,
    restaurantName,
    restaurantSlug,
    publishStatus,
  } = useMenuBuilderStore()
  const [isLoading, setIsLoading] = useState(true)

  async function toggleRestaurant() {
    const restaurantId = useAuthStore.getState().restaurant?.id
    if (!restaurantId) return
    const isOpen = !style.isOpen
    setMenuStyle({ isOpen })
    const { error } = await supabase.from('restaurants').update({ is_open: isOpen }).eq('id', restaurantId)
    if (error) {
      setMenuStyle({ isOpen: !isOpen })
      toast.error('تعذّر تغيير حالة المطعم. تأكد من تسجيل الدخول ثم حاول مجددًا.')
      return
    }
    toast.success(isOpen ? 'المطعم مفتوح ويستقبل الطلبات.' : 'المطعم مغلق مؤقتًا؛ يبقى المنيو مرئيًا فقط.')
  }

  useEffect(() => {
    async function run() {
      const restaurant = useAuthStore.getState().restaurant
      if (!restaurant?.id) {
        setIsLoading(false)
        return
      }
      setContext({
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
        restaurantName: restaurant.name,
      })
      try {
        const [catsRes, itemsRes, brandRes, restaurantRes] = await Promise.all([
          supabase
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .order('sort_order'),
          supabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .order('sort_order'),
          supabase
            .from('restaurant_branding')
            .select('style, logo_path, menu_style')
            .eq('restaurant_id', restaurant.id)
            .maybeSingle(),
          supabase
            .from('restaurants')
            .select('name, slug, description, is_open')
            .eq('id', restaurant.id)
            .maybeSingle(),
        ])
        if (catsRes.error) throw catsRes.error
        const savedStyle = (brandRes.data?.style as MenuStyle | null) ?? null
        const hasBrokenLegacyDelivery =
          (savedStyle?.menuTemplate as string) === 'delivery' &&
          savedStyle?.themeMode === 'light' &&
          (savedStyle?.backgroundColor === '#000000' || savedStyle?.secondaryColor === '#000000')
        const normalizedSavedStyle = hasBrokenLegacyDelivery
          ? {
              ...savedStyle,
              menuTemplate: 'delivery-app' as const,
              accentColor: '#ea580c',
              secondaryColor: '#fff3eb',
              backgroundColor: '#fffaf7',
            }
          : savedStyle
        const savedTemplate =
          brandRes.data?.menu_style === 'aurora' ||
          brandRes.data?.menu_style === 'noir' ||
          brandRes.data?.menu_style === 'souk' ||
          brandRes.data?.menu_style === 'volt' ||
          brandRes.data?.menu_style === 'bustan'
          || brandRes.data?.menu_style === 'ivory'
          || brandRes.data?.menu_style === 'neon'
          || brandRes.data?.menu_style === 'majesty'
          || brandRes.data?.menu_style === 'cafe'
          || brandRes.data?.menu_style === 'market'
          || brandRes.data?.menu_style === 'modern'
          || brandRes.data?.menu_style === 'delivery'
          || brandRes.data?.menu_style === 'delivery-app'
            ? brandRes.data.menu_style
            : 'aurora'
        if (brandRes.data?.logo_path)
          setRestaurantLogoUrl(getMenuImageUrl(brandRes.data.logo_path))
        if (!restaurantRes.error) {
          setContext({
            restaurantId: restaurant.id,
            restaurantSlug: restaurantRes.data?.slug ?? restaurant.slug,
            restaurantName: restaurantRes.data?.name ?? restaurant.name,
          })
          setRestaurantDescription(restaurantRes.data?.description ?? null)
        }
        load({
          categories: (catsRes.data ?? []).map((category) => ({
            id: category.id,
            name: category.name,
            name_ar: category.name_ar,
            sort_order: category.sort_order,
            is_active: category.is_active,
          })),
          items: (itemsRes.data ?? []).map((item) => ({
            id: item.id,
            category_id: item.category_id,
            name: item.name,
            name_ar: item.name_ar,
            description: item.description,
            price: item.price,
            image_path: item.image_path,
            is_available: item.is_available,
            sort_order: item.sort_order,
          })),
          style: normalizedSavedStyle
            ? { ...normalizedSavedStyle, menuTemplate: normalizedSavedStyle.menuTemplate ?? savedTemplate, isOpen: restaurantRes.data?.is_open ?? normalizedSavedStyle.isOpen }
            : {
                layoutTemplate: 'grid-cards',
                menuTemplate: savedTemplate,
                themeMode: 'dark',
                accentColor: '#22d3ee',
                secondaryColor: '#7c3aed',
                gradientAngle: 135,
                backgroundColor: '#fffdf9',
                neonLineEnabled: false,
                socialLinks: { whatsapp: '', instagram: '', facebook: '', tiktok: '' },
                socialVisibility: { whatsapp: false, instagram: false, facebook: false, tiktok: false },
                entryAdEnabled: false,
                entryAdImageUrl: null,
                entryAdTitle: '',
                entryAdMessage: '',
                isOpen: restaurantRes.data?.is_open ?? true,
                bannerUrls: [],
              },
        })
      } catch (error) {
        // eslint-disable-next-line no-console -- the canvas remains usable if menu loading fails.
        console.error('Failed to load menu builder data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    void run()
  }, [load, setContext, setRestaurantDescription, setRestaurantLogoUrl])

  const visibleCategories = useMemo(
    () => categories.filter((category) => !category._isDeleted),
    [categories]
  )
  const visibleItems = useMemo(
    () => items.filter((item) => !item._isDeleted),
    [items]
  )
  if (isLoading) {
    return (
      <div className='flex min-h-svh items-center justify-center bg-[#090d1b] text-slate-300'>
        <div className='flex flex-col items-center gap-3'>
          <Loader2 className='size-7 animate-spin text-emerald-400' />
          <span className='text-sm'>{language === 'ar' ? 'جارٍ تجهيز مساحة العمل…' : 'Preparing your workspace…'}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      dir={direction}
      className='min-h-svh bg-[#090d1b] text-slate-100 selection:bg-emerald-400/30'
    >
      <header className='sticky top-0 z-30 border-b border-white/7 bg-[#090d1b]/90 backdrop-blur-xl'>
        <div className='mx-auto flex max-w-[1560px] items-center justify-between gap-5 px-5 py-4 lg:px-8'>
          <div className='flex min-w-0 items-center gap-3'>
            <div className='grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'>
              <Sparkles className='size-5' />
            </div>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <h1 className='truncate text-base font-bold sm:text-lg'>
                  {language === 'ar' ? 'صانع المنيو' : 'Menu builder'}
                </h1>
                <span className='hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 sm:inline'>
                  {language === 'ar' ? 'تعديل مباشر' : 'Live editing'}
                </span>
              </div>
              <p className='mt-0.5 truncate text-xs text-slate-400'>
                {restaurantName ?? (language === 'ar' ? 'مطعمك' : 'Your restaurant')} · /menu/{restaurantSlug ?? '...'}
              </p>
            </div>
          </div>
          <div
            className={cn(
              'hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold md:flex',
              publishStatus === 'success'
                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                : 'border-white/10 bg-white/5 text-slate-400'
            )}
          >
            <CircleCheck className='size-3.5' />
            {publishStatus === 'success'
              ? language === 'ar' ? 'كل التغييرات منشورة' : 'All changes published'
              : language === 'ar' ? 'عدّل ثم انشر التغييرات' : 'Edit, then publish changes'}
          </div>
          <button type='button' onClick={() => void toggleRestaurant()} className={cn('rounded-full border px-3 py-1.5 text-xs font-bold transition', style.isOpen ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-200')}>
            <span className='ml-1.5 inline-block size-1.5 rounded-full bg-current' />
            {style.isOpen ? (language === 'ar' ? 'المطعم مفتوح' : 'Restaurant open') : (language === 'ar' ? 'المطعم مغلق' : 'Restaurant closed')}
          </button>
          <LanguageToggle />
        </div>
      </header>

      <main className='mx-auto grid max-w-[1440px] gap-5 px-5 py-6 pb-10 xl:grid-cols-[minmax(0,1fr)_390px] lg:px-8'>
        <section className='space-y-5'>
          <section className='overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-emerald-400/10 to-white/[0.025] shadow-2xl shadow-black/15'>
            <div className='border-b border-white/8 px-4 py-4'>
              <div className='flex items-center gap-2'>
                <Sparkles className='size-4 text-emerald-300' />
                <p className='text-xs font-bold text-slate-100'>
                  {language === 'ar' ? 'مكتبة القوالب' : 'Template library'}
                </p>
              </div>
              <p className='mt-1 text-[11px] leading-5 text-slate-400'>
                {language === 'ar' ? 'قوالب ثابتة التصميم. اختر قالبًا ثم انشره ليظهر للزبون.' : 'Locked designs. Choose one and publish it for customers.'}
              </p>
            </div>
            <div className='grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3'>
              {MENU_THEMES.map((template) => {
                const selected = style.menuTemplate === template.id
                return (
                  <button
                    key={template.id}
                    type='button'
                    onClick={() =>
                      setMenuStyle({
                        menuTemplate: template.id,
                        themeMode: template.themeMode,
                        layoutTemplate: template.layoutTemplate,
                        accentColor: template.accentColor,
                        ...(template.id === 'delivery-app'
                          ? {
                              secondaryColor: '#fff3eb',
                              backgroundColor: '#fffaf7',
                            }
                          : {}),
                      })
                    }
                    className={cn(
                      'min-h-20 rounded-xl border p-2 text-right transition',
                      selected
                        ? 'border-emerald-300 bg-emerald-400/15 shadow-lg shadow-emerald-400/10'
                        : 'border-white/10 bg-slate-950/20 hover:border-emerald-300/35 hover:bg-white/5'
                    )}
                  >
                    <span className='mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-100'>
                      <i className='size-2.5 rounded-full' style={{ backgroundColor: template.accentColor }} />
                      {template.label}
                    </span>
                    <span className='block text-[9px] leading-4 text-slate-400'>{template.description}</span>
                  </button>
                )
              })}
            </div>
          </section>
          <section className='overflow-hidden rounded-2xl border border-white/8 bg-white/[0.035] shadow-2xl shadow-black/15'>
            <div className='border-b border-white/7 px-4 py-4'>
              <p className='text-xs font-bold text-slate-200'>{language === 'ar' ? 'محتوى المنيو' : 'Menu content'}</p>
              <p className='mt-1 text-[11px] leading-5 text-slate-500'>
                {language === 'ar' ? 'أضف الأقسام والوجبات أو عدّلها من أدوات الإدارة؛ هذه الصفحة مخصصة لإعدادات الهوية والتشغيل.' : 'Manage categories and items from the menu section; this page is dedicated to brand and operation settings.'}
              </p>
            </div>
            <div className='grid gap-2 p-3 sm:grid-cols-2'>
              {visibleCategories.length ? (
                visibleCategories.map((category) => {
                  const count = visibleItems.filter(
                    (item) => item.category_id === category.id
                  ).length
                  return (
                    <div
                      key={category.id}
                      className='flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-right'
                    >
                      <ClipboardList className='size-4 text-slate-600' />
                      <span className='min-w-0 flex-1 truncate text-xs font-semibold text-slate-200'>
                        {language === 'ar' ? category.name_ar ?? category.name : category.name}
                      </span>
                      <span className='rounded-md bg-white/6 px-1.5 py-0.5 text-[10px] text-slate-400'>
                        {count}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className='rounded-xl border border-dashed border-white/10 px-3 py-7 text-center text-xs leading-5 text-slate-500'>
                  {language === 'ar' ? 'أضف أول قسم لتبدأ بناء المنيو.' : 'Add your first category to start building the menu.'}
                </div>
              )}
            </div>
          </section>
          <OperationsSettings restaurantId={useAuthStore.getState().restaurant?.id ?? null} />
        </section>

        <aside className='space-y-4'>
          <section className='rounded-2xl border border-white/8 bg-white/[0.035] p-4'>
            <div className='flex items-center gap-2'>
              <PackageOpen className='size-4 text-emerald-300' />
              <h2 className='text-sm font-bold'>{language === 'ar' ? 'ملخص المحتوى' : 'Content overview'}</h2>
            </div>
            <div className='mt-4 grid grid-cols-2 gap-2'>
              <div className='rounded-xl bg-white/5 p-3'>
                <PackageOpen className='size-4 text-slate-400' />
                <strong className='mt-3 block text-xl'>
                  {visibleItems.length}
                </strong>
                <span className='text-[10px] text-slate-500'>{language === 'ar' ? 'وجبة' : 'items'}</span>
              </div>
              <div className='rounded-xl bg-white/5 p-3'>
                <ClipboardList className='size-4 text-slate-400' />
                <strong className='mt-3 block text-xl'>
                  {visibleCategories.length}
                </strong>
                <span className='text-[10px] text-slate-500'>{language === 'ar' ? 'قسم' : 'categories'}</span>
              </div>
            </div>
          </section>
          <section className='rounded-2xl border border-white/8 bg-white/[0.035] p-3'>
            <FloatingToolbar embedded />
          </section>
        </aside>
      </main>
    </div>
  )
}
