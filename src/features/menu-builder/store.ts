import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type {
  DraftCategory,
  DraftItem,
  MenuBuilderPublishResult,
  MenuDraft,
  MenuStyle,
  MenuTemplateId,
} from './types'

const LOCKED_TEMPLATE_STYLES: Record<
  Extract<MenuTemplateId, 'aurora' | 'noir' | 'souk' | 'volt' | 'bustan' | 'ivory'>,
  Pick<MenuStyle, 'layoutTemplate' | 'themeMode' | 'accentColor' | 'secondaryColor' | 'backgroundColor'>
> = {
  aurora: { layoutTemplate: 'grid-cards', themeMode: 'light', accentColor: '#ed6a3a', secondaryColor: '#fff1e8', backgroundColor: '#fff8f2' },
  noir: { layoutTemplate: 'grid-cards', themeMode: 'dark', accentColor: '#d7b46a', secondaryColor: '#2b2418', backgroundColor: '#101112' },
  souk: { layoutTemplate: 'list-categories', themeMode: 'light', accentColor: '#a84d2a', secondaryColor: '#f5dfc4', backgroundColor: '#fff7e8' },
  volt: { layoutTemplate: 'list-categories', themeMode: 'dark', accentColor: '#44e7b6', secondaryColor: '#172843', backgroundColor: '#131426' },
  bustan: { layoutTemplate: 'list-categories', themeMode: 'light', accentColor: '#478b5e', secondaryColor: '#d8ebd7', backgroundColor: '#edf4eb' },
  ivory: { layoutTemplate: 'list-categories', themeMode: 'light', accentColor: '#8a6a42', secondaryColor: '#efe2c9', backgroundColor: '#f7f1e5' },
}

function lockedTemplateStyle(template: MenuTemplateId) {
  return template in LOCKED_TEMPLATE_STYLES
    ? LOCKED_TEMPLATE_STYLES[template as keyof typeof LOCKED_TEMPLATE_STYLES]
    : null
}

function tempId(prefix = 'temp') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

interface MenuBuilderState {
  restaurantId: string | null
  restaurantSlug: string | null
  restaurantName: string | null
  restaurantDescription: string | null
  restaurantLogoUrl: string | null
  googleMapsUrl: string | null
  wazeUrl: string | null
  categories: DraftCategory[]
  items: DraftItem[]
  editedItemId: string | null
  isPublishing: boolean
  publishStatus: 'idle' | 'success' | 'error'
  publishError: string | null
  style: MenuStyle
  originalStyle: MenuStyle | null

  setContext: (ctx: { restaurantId: string; restaurantSlug: string; restaurantName: string }) => void
  setRestaurantName: (name: string | null) => void
  setRestaurantDescription: (description: string | null) => void
  setRestaurantLogoUrl: (url: string | null) => void
  setGoogleMapsUrl: (url: string | null) => void
  setWazeUrl: (url: string | null) => void
  load: (draft: MenuDraft) => void
  reset: () => void
  setMenuStyle: (patch: Partial<MenuStyle>) => void
  restoreOriginalStyle: () => void
  setBannerUrls: (urls: string[]) => void
  addBannerUrl: (url: string) => void
  removeBannerUrl: (url: string) => void
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
  restaurantDescription: null,
  restaurantLogoUrl: null,
  googleMapsUrl: null,
  wazeUrl: null,
  categories: [],
  items: [],
  editedItemId: null,
  isPublishing: false,
  publishStatus: 'idle',
  publishError: null,
  originalStyle: null,
  style: {
      menuTemplate: 'aurora',
    layoutTemplate: 'grid-cards',
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
    isOpen: true,
    bannerUrls: [],
  },

  setContext: (ctx) =>
    set({
      restaurantId: ctx.restaurantId,
      restaurantSlug: ctx.restaurantSlug,
      restaurantName: ctx.restaurantName,
    }),

  setRestaurantName: (name) => set({ restaurantName: name }),
  setRestaurantDescription: (description) => set({ restaurantDescription: description }),
  setRestaurantLogoUrl: (url) => set({ restaurantLogoUrl: url }),
  setGoogleMapsUrl: (url) => set({ googleMapsUrl: url }),
  setWazeUrl: (url) => set({ wazeUrl: url }),

  load: (draft) => {
    const normalizedStyle: MenuStyle = {
      menuTemplate: draft.style?.menuTemplate ?? 'aurora',
      layoutTemplate: draft.style?.layoutTemplate ?? 'grid-cards',
      themeMode: draft.style?.themeMode ?? 'dark',
      accentColor: draft.style?.accentColor ?? '#22d3ee',
      secondaryColor: draft.style?.secondaryColor ?? '#7c3aed',
      gradientAngle: draft.style?.gradientAngle ?? 135,
      backgroundColor: draft.style?.backgroundColor ?? '#fffdf9',
      neonLineEnabled: draft.style?.neonLineEnabled ?? false,
      socialLinks: draft.style?.socialLinks ?? { whatsapp: '', instagram: '', facebook: '', tiktok: '' },
      socialVisibility: draft.style?.socialVisibility ?? { whatsapp: false, instagram: false, facebook: false, tiktok: false },
      entryAdEnabled: draft.style?.entryAdEnabled ?? false,
      entryAdImageUrl: draft.style?.entryAdImageUrl ?? null,
      entryAdTitle: draft.style?.entryAdTitle ?? '',
      entryAdMessage: draft.style?.entryAdMessage ?? '',
      isOpen: draft.style?.isOpen ?? true,
      bannerUrls: Array.isArray(draft.style?.bannerUrls) ? draft.style.bannerUrls : [],
    }
    set({
      categories: draft.categories.map((c) => ({ ...c, _isNew: false, _isDeleted: false })),
      items: draft.items.map((i) => ({ ...i, _isNew: false, _isDeleted: false })),
      style: normalizedStyle,
      originalStyle: structuredClone(normalizedStyle),
    })
  },

  reset: () =>
    set({
      categories: [],
      items: [],
      editedItemId: null,
      restaurantDescription: null,
      restaurantLogoUrl: null,
      googleMapsUrl: null,
      wazeUrl: null,
      publishStatus: 'idle',
      publishError: null,
      style: {
        menuTemplate: 'aurora',
        layoutTemplate: 'grid-cards',
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
        isOpen: true,
        bannerUrls: [],
      },
    }),

  setMenuStyle: (patch) =>
    set((state) => {
      const fixedStyle = lockedTemplateStyle(patch.menuTemplate ?? state.style.menuTemplate)
      return { style: fixedStyle ? { ...state.style, ...patch, ...fixedStyle } : { ...state.style, ...patch } }
    }),
  restoreOriginalStyle: () =>
    set((state) =>
      state.originalStyle
        ? { style: structuredClone(state.originalStyle), publishStatus: 'idle' }
        : {}
    ),

  setBannerUrls: (urls: string[]) => get().setMenuStyle({ bannerUrls: urls }),

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

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      set({ publishStatus: 'error', publishError: 'انتهت جلسة تسجيل الدخول.' })
      return { ok: false, error: 'انتهت جلسة تسجيل الدخول.' }
    }

    set({ isPublishing: true, publishStatus: 'idle', publishError: null })

    try {
      const { categories, items, restaurantName, style } = get()

      // احذف الوجبات أولاً ثم الأقسام؛ يمنع ذلك تعارض المفاتيح الأجنبية.
      for (const item of items.filter((item) => item._isDeleted)) {
        const { error } = await supabase.from('menu_items').delete().eq('id', item.id)
        if (error) throw error
      }
      for (const category of categories.filter((category) => category._isDeleted)) {
        const { error } = await supabase
          .from('menu_categories')
          .delete()
          .eq('id', category.id)
        if (error) throw error
      }

      // تحفظ الأقسام الجديدة أولاً ونستبدل المعرفات المؤقتة بمعرفات Supabase.
      const categoryIds = new Map<string, string>()
      const persistedCategories: DraftCategory[] = []
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
          const { data, error } = await supabase
            .from('menu_categories')
            .insert(payload)
            .select('id')
            .single()
          if (error) throw error
          categoryIds.set(cat.id, data.id)
          persistedCategories.push({ ...cat, id: data.id, _isNew: false })
        } else {
          const { error } = await supabase
            .from('menu_categories')
            .update(payload)
            .eq('id', cat.id)
          if (error) throw error
          persistedCategories.push({ ...cat, _isNew: false, _isDeleted: false })
        }
      }

      // الوجبات تستخدم المعرف الحقيقي للقسم الجديد، لا المعرّف المؤقت.
      const persistedItems: DraftItem[] = []
      const upsertItems = items.filter((i) => !i._isDeleted)
      for (const it of upsertItems) {
        const categoryId = categoryIds.get(it.category_id) ?? it.category_id
        const payload = {
          category_id: categoryId,
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
          const { data, error } = await supabase
            .from('menu_items')
            .insert(payload)
            .select('id')
            .single()
          if (error) throw error
          persistedItems.push({
            ...it,
            id: data.id,
            category_id: categoryId,
            _isNew: false,
          })
        } else {
          const { error } = await supabase.from('menu_items').update(payload).eq('id', it.id)
          if (error) throw error
          persistedItems.push({
            ...it,
            category_id: categoryId,
            _isNew: false,
            _isDeleted: false,
          })
        }
      }

      // 5. حفظ نمط العرض في restaurant_branding
      const { error: brandingError } = await supabase
        .from('restaurant_branding')
        .upsert(
          {
            restaurant_id: restaurantId,
            menu_style: style.menuTemplate,
            style,
          },
          { onConflict: 'restaurant_id' }
        )

      if (brandingError) throw brandingError

      // 6. حفظ إعدادات الهوية في جدول restaurants
      const { error: restaurantError } = await supabase
        .from('restaurants')
        .update({
          name: restaurantName ?? undefined,
          description: get().restaurantDescription ?? undefined,
          is_open: style.isOpen,
          google_maps_url: get().googleMapsUrl ?? undefined,
          waze_url: get().wazeUrl ?? undefined,
        })
        .eq('id', restaurantId)

      if (restaurantError) throw restaurantError

      set({
        categories: persistedCategories,
        items: persistedItems,
        isPublishing: false,
        publishStatus: 'success',
        publishError: null,
      })
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
