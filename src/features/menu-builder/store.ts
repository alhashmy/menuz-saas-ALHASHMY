import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type {
  DraftCategory,
  DraftItem,
  MenuBuilderPublishResult,
  MenuDraft,
  MenuStyle,
  NeonAnimation,
} from './types'

function tempId(prefix = 'temp') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

interface MenuBuilderState {
  restaurantId: string | null
  restaurantSlug: string | null
  restaurantName: string | null
  categories: DraftCategory[]
  items: DraftItem[]
  editedItemId: string | null
  isPublishing: boolean
  publishStatus: 'idle' | 'success' | 'error'
  publishError: string | null
  style: MenuStyle

  setContext: (ctx: { restaurantId: string; restaurantSlug: string; restaurantName: string }) => void
  load: (draft: MenuDraft) => void
  reset: () => void
  setMenuStyle: (patch: Partial<MenuStyle>) => void
  setBannerUrls: (urls: string[]) => void
  addBannerUrl: (url: string) => void
  removeBannerUrl: (url: string) => void
  setNeonAnimation: (animation: NeonAnimation) => void
  uploadBanner: (file: File) => Promise<string[]>

  addCategory: () => void
  updateCategory: (id: string, patch: Partial<DraftCategory>) => void
  deleteCategory: (id: string) => void
  reorderCategories: (ids: string[]) => void

  addItem: (categoryId: string) => void
  updateItem: (id: string, patch: Partial<DraftItem>) => void
  deleteItem: (id: string) => void
  reorderItems: (categoryId: string, ids: string[]) => void

  setEditedItem: (id: string | null) => void
  publish: () => Promise<MenuBuilderPublishResult>
}

export const useMenuBuilderStore = create<MenuBuilderState>((set, get) => ({
  restaurantId: null,
  restaurantSlug: null,
  restaurantName: null,
  categories: [],
  items: [],
  editedItemId: null,
  isPublishing: false,
  publishStatus: 'idle',
  publishError: null,
  style: { layout: 'list', accentColor: '#22d3ee', bannerUrls: [], neonEnabled: false, neonColor: '#22d3ee', backgroundColor: '#0b0f19' },

  setContext: (ctx) => set({ restaurantId: ctx.restaurantId, restaurantSlug: ctx.restaurantSlug, restaurantName: ctx.restaurantName }),

  load: (draft) =>
    set({
      categories: draft.categories.map((c) => ({ ...c, _isNew: false, _isDeleted: false })),
      items: draft.items.map((i) => ({ ...i, _isNew: false, _isDeleted: false })),
      style: {
        layout: draft.style?.layout ?? 'list',
        accentColor: draft.style?.accentColor ?? '#22d3ee',
        bannerUrls: Array.isArray(draft.style?.bannerUrls) ? draft.style.bannerUrls : [],
        neonEnabled: draft.style?.neonEnabled ?? false,
        neonColor: draft.style?.neonColor ?? '#22d3ee',
        backgroundColor: draft.style?.backgroundColor ?? '#0b0f19',
      },
    }),

  reset: () =>
    set({ categories: [], items: [], editedItemId: null, publishStatus: 'idle', publishError: null, style: { layout: 'list', accentColor: '#22d3ee', bannerUrls: [], neonEnabled: false, neonColor: '#22d3ee', backgroundColor: '#0b0f19' } }),

  setMenuStyle: (patch) =>
    set((state) => ({ style: { ...state.style, ...patch } })),

  setBannerUrls: (urls: string[]) => get().setMenuStyle({ bannerUrls: urls }),
  setNeonEnabled: (enabled: boolean) => get().setMenuStyle({ neonEnabled: enabled }),
  setNeonColor: (color: string) => get().setMenuStyle({ neonColor: color }),
  setBackgroundColor: (color: string) => get().setMenuStyle({ backgroundColor: color }),

  addBannerUrl: (url: string) => {
    const current = get().style.bannerUrls
    const next = [...current.filter((u) => u !== url), url].slice(0, 3)
    get().setMenuStyle({ bannerUrls: next })
  },

  removeBannerUrl: (url: string) => {
    const current = get().style.bannerUrls
    get().setMenuStyle({ bannerUrls: current.filter((u) => u !== url) })
  },

  uploadBanner: async (file: File) => {
    const { restaurantId } = get()
    if (!restaurantId) throw new Error('لا يوجد مطرب مرتبط بالحساب.')

    const currentUrls = get().style.bannerUrls
    if (currentUrls.length >= 3) throw new Error('لا يمكن رفع أكثر من 3 صور إعلانية.')

    const fileExt = file.name.split('.').pop() ?? 'jpg'
    const fileName = `banner_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${fileExt}`
    const filePath = `banners/${restaurantId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) throw uploadError

    const { data: urlData } = await supabase.storage
      .from('banners')
      .getPublicUrl(filePath)

    get().addBannerUrl(urlData.publicUrl)
    return get().style.bannerUrls
  },


  addCategory: () => {
    const category: DraftCategory = {
      id: tempId('cat'),
      name: 'قسم جديد',
      name_ar: 'قسم جديد',
      sort_order: get().categories.length,
      is_active: true,
      _isNew: true,
    }
    set((state) => ({ categories: [...state.categories, category] }))
  },

  updateCategory: (id, patch) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    })),

  deleteCategory: (id) => {
    const category = get().categories.find((c) => c.id === id)
    if (!category) return
    // حذف منطقي: إذا كان 섹س جديد يُزال مباشرة، وإلا يُعدّل للحذف عند النشر
    if (category._isNew) {
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
        items: state.items.filter((i) => i.category_id !== id),
      }))
    } else {
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === id ? { ...c, _isDeleted: true } : c
        ),
        items: state.items.map((i) =>
          i.category_id === id ? { ...i, _isDeleted: true } : i
        ),
      }))
    }
  },

  reorderCategories: (ids) =>
    set((state) => ({
      categories: state.categories
        .map((c) => {
          const order = ids.indexOf(c.id)
          return order !== -1 ? { ...c, sort_order: order } : c
        })
        .sort((a, b) => a.sort_order - b.sort_order),
    })),

  addItem: (categoryId) => {
    const item: DraftItem = {
      id: tempId('item'),
      category_id: categoryId,
      name: 'وجبة جديدة',
      name_ar: 'وجبة جديدة',
      description: null,
      price: 0,
      image_path: null,
      is_available: true,
      sort_order: get().items.filter((i) => i.category_id === categoryId).length,
      _isNew: true,
    }
    set((state) => ({ items: [...state.items, item] }))
  },

  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),

  deleteItem: (id) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    if (item._isNew) {
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
    } else {
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? { ...i, _isDeleted: true } : i)),
      }))
    }
  },

  reorderItems: (categoryId, ids) =>
    set((state) => ({
      items: state.items
        .map((i) => {
          if (i.category_id !== categoryId) return i
          const order = ids.indexOf(i.id)
          return order !== -1 ? { ...i, sort_order: order } : i
        })
        .sort((a, b) => (a.category_id === b.category_id ? a.sort_order - b.sort_order : 0)),
    })),

  setEditedItem: (id) => set({ editedItemId: id }),

  publish: async () => {
    const { restaurantId } = get()
    if (!restaurantId) {
      set({ publishStatus: 'error', publishError: 'لا يوجد مطعم مرتبط بالحساب.' })
      return { ok: false, error: 'لا يوجد مطعم مرتبط بالحساب.' }
    }

    // تأكيد الجلسة الحالية لمرور الطلب عبر قواعد الحماية (RLS)
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      set({ publishStatus: 'error', publishError: 'انتهت جلسة تسجيل الدخول.' })
      return { ok: false, error: 'انتهت جلسة تسجيل الدخول.' }
    }

    set({ isPublishing: true, publishStatus: 'idle', publishError: null })

    try {
      const { categories, items } = get()

      // 1. الأقسام: إدراج الجديد وتعديل الموجود
      const upsertCategories = categories.filter((c) => !c._isDeleted)
      for (const cat of upsertCategories) {
        const payload = {
          name: cat.name,
          name_ar: cat.name_ar,
          sort_order: cat.sort_order,
          is_active: cat.is_active,
          restaurant_id: restaurantId,
        }
        if (cat._isNew) {
          const { error } = await supabase
            .from('menu_categories')
            .insert(payload)
            .select('id')
            .single()
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('menu_categories')
            .update(payload)
            .eq('id', cat.id)
          if (error) throw error
        }
      }

      // 2. حذف الأقسام المشار إليها
      for (const cat of categories.filter((c) => c._isDeleted)) {
        await supabase.from('menu_categories').delete().eq('id', cat.id)
      }

      // 3. الوجبات: إدراج الجديد وتعديل الموجود
      const upsertItems = items.filter((i) => !i._isDeleted)
      for (const it of upsertItems) {
        const payload = {
          category_id: it.category_id,
          name: it.name,
          name_ar: it.name_ar,
          description: it.description,
          price: it.price,
          image_path: it.image_path,
          is_available: it.is_available,
          sort_order: it.sort_order,
          restaurant_id: restaurantId,
        }
        if (it._isNew) {
          const { error } = await supabase.from('menu_items').insert(payload)
          if (error) throw error
        } else {
          const { error } = await supabase.from('menu_items').update(payload).eq('id', it.id)
          if (error) throw error
        }
      }

      // 4. حذف الوجبات المشار إليها
      for (const it of items.filter((i) => i._isDeleted)) {
        await supabase.from('menu_items').delete().eq('id', it.id)
      }

      // 5. حفظ نمط العرض (style) بشكل دائم في جدول restaurant_branding ( upsert لتجنب تعارض 409 )
      const { style } = get()
      const { error: brandingError } = await supabase
        .from('restaurant_branding')
        .upsert({ restaurant_id: restaurantId, style }, { onConflict: 'restaurant_id' })

      if (brandingError) throw brandingError

      set({ isPublishing: false, publishStatus: 'success', publishError: null })
      return { ok: true, error: null }
    } catch (err) {
      set({
        isPublishing: false,
        publishStatus: 'error',
        publishError: err instanceof Error ? err.message : 'فشل النشر، حاول مرة أخرى.',
      })
      return { ok: false, error: err instanceof Error ? err.message : 'فشل النشر، حاول مرة أخرى.' }
    }
  },
}))
