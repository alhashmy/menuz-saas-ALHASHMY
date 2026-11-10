'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useMenuBuilderStore } from '../store'
import type { MenuStyle } from '../types'
import { MobileCanvas } from './MobileCanvas'
import { FloatingToolbar } from './FloatingToolbar'
import { PropertiesPanel } from './PropertiesPanel'

export function MenuBuilder() {
  const {
    categories,
    items,
    setContext,
    reorderCategories,
    reorderItems,
    deleteCategory,
    load,
    style,
  } = useMenuBuilderStore()

  const [panelTarget, setPanelTarget] = useState<{
    type: 'item' | 'category'
    id: string
  } | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
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
        const [catsRes, itemsRes, brandRes] = await Promise.allSettled([
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
            .select('style')
            .eq('restaurant_id', restaurant.id)
            .maybeSingle(),
        ])

        const savedStyle: MenuStyle | null =
          brandRes.status === 'fulfilled' && brandRes.data?.style
            ? (brandRes.data.style as MenuStyle | null)
            : null

        if (catsRes.status === 'fulfilled' && !catsRes.error) {
          load({
            categories: (catsRes.value.data ?? []).map((c) => ({
              id: c.id,
              name: c.name,
              name_ar: c.name_ar,
              sort_order: c.sort_order,
              is_active: c.is_active,
            })),
            items:
              itemsRes.status === 'fulfilled' && itemsRes.value?.data
                ? (itemsRes.value.data ?? []).map((it) => ({
                    id: it.id,
                    category_id: it.category_id,
                    name: it.name,
                    name_ar: it.name_ar,
                    description: it.description,
                    price: it.price,
                    image_path: it.image_path,
                    is_available: it.is_available,
                    sort_order: it.sort_order,
                  }))
                : [],
            style: savedStyle ?? {
              layout: 'list',
              accentColor: '#22d3ee',
              bannerUrls: [],
              neonEnabled: false,
              neonColor: '#22d3ee',
            },
          })
        }
      } catch (err) {
        // eslint-disable-next-line no-console -- required by spec: log load failures without blocking UI
        console.error('Failed to load menu builder data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    run()

    const timeoutGuard = setTimeout(() => {
      setIsLoading(false)
    }, 2500)

    return () => clearTimeout(timeoutGuard)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- spec requires empty dependency array to prevent refetch loops
  }, [])

  const handleCategoryEdit = useCallback((id: string) => {
    setPanelTarget({ type: 'category', id })
    setIsPanelOpen(true)
  }, [])

  const handleCategoryDelete = useCallback((id: string) => {
    deleteCategory(id)
  }, [deleteCategory])

  const handleItemClick = useCallback((id: string) => {
    setPanelTarget({ type: 'item', id })
    setIsPanelOpen(true)
  }, [])

  const handleReorderCategories = useCallback((ids: string[]) => {
    reorderCategories(ids)
  }, [reorderCategories])

  const handleReorderItems = useCallback(
    (categoryId: string, ids: string[]) => {
      reorderItems(categoryId, ids)
    },
    [reorderItems]
  )

  return (
    <div className='bg-slate-950 min-h-screen p-6'>
      {isLoading ? (
        <div className='flex flex-col items-center justify-center gap-4 max-w-[500px] mx-auto h-[600px]'>
          <Loader2 className='size-8 animate-spin text-muted-foreground' />
          <p className='text-sm text-slate-400'>جارٍ تحميل المنيو المحفوظ…</p>
        </div>
      ) : (
        <>
          <div className='flex flex-col items-center justify-center gap-8 max-w-[500px] mx-auto'>
            <MobileCanvas
              categories={categories}
              items={items}
              style={style}
              onCategoryEdit={handleCategoryEdit}
              onCategoryDelete={handleCategoryDelete}
              onItemClick={handleItemClick}
              onReorderCategories={handleReorderCategories}
              onReorderItems={handleReorderItems}
            />
            <FloatingToolbar />
          </div>

          {isPanelOpen && (
            <PropertiesPanel
              open={isPanelOpen}
              target={panelTarget}
              onClose={() => setIsPanelOpen(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
