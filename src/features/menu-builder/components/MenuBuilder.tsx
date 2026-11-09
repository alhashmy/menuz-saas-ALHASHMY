'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { useMenuBuilderStore } from '../store'
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

  const { restaurant } = useAuthStore.getState()

  const [panelTarget, setPanelTarget] = useState<{
    type: 'item' | 'category'
    id: string
  } | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  useEffect(() => {
    if (!restaurant?.id) return
    setContext({
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
    })

    ;(async () => {
      const [catsRes, itemsRes] = await Promise.all([
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
      ])

      if (!catsRes.error) {
        load({
          categories: (catsRes.data ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            name_ar: c.name_ar,
            sort_order: c.sort_order,
            is_active: c.is_active,
          })),
          items: (itemsRes.data ?? []).map((it) => ({
            id: it.id,
            category_id: it.category_id,
            name: it.name,
            name_ar: it.name_ar,
            description: it.description,
            price: it.price,
            image_path: it.image_path,
            is_available: it.is_available,
            sort_order: it.sort_order,
          })),
          style: { layout: 'list', accentColor: '#22d3ee', bannerUrl: null, neonEnabled: false, neonPlacement: null },
        })
      }
    })()
  }, [restaurant, setContext, load])

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
    </div>
  )
}
