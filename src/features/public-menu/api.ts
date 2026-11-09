import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PublicMenuItem {
  id: string
  category_id: string
  name: string
  name_ar: string | null
  description: string | null
  description_ar: string | null
  price: number
  image_path: string | null
  is_available: boolean
}

export interface PublicMenuCategory {
  id: string
  name: string
  name_ar: string | null
  sort_order: number
  items: PublicMenuItem[]
}

export interface PublicRestaurant {
  id: string
  slug: string
  name: string
  name_ar: string | null
}

export interface PublicBranding {
  primary_color: string
  accent_color: string
  theme_mode: 'light' | 'dark' | 'system'
  /** معرّف أحد قوالب المنيو العشرة الجاهزة */
  menu_style: string
  logo_path: string | null
  /** نمط العرض المحفوظ من منشئ القوائم (JSONB) */
  style: {
    layout: 'list' | 'grid-2' | 'grid-3' | 'cards'
    accentColor: string
    bannerUrl: string | null
    neonEnabled: boolean
    neonPlacement: 'cards' | 'strips' | 'all' | null
  } | null
}

export interface PublicItemOffer {
  id: string
  item_id: string
  discount_kind: 'percentage' | 'fixed'
  discount_value: number
}

export interface PublicOrderOffer {
  id: string
  title_ar: string | null
  title: string
  promo_code: string
  discount_kind: 'percentage' | 'fixed'
  discount_value: number
}

export interface PublicMenuData {
  restaurant: PublicRestaurant
  branding: PublicBranding | null
  categories: PublicMenuCategory[]
  /** خصومات على أصناف محددة، مفتاحها item_id لتسهيل الوصول السريع */
  itemOffers: Record<string, PublicItemOffer>
  /** أكواد برومو فعّالة على كامل الطلب */
  orderOffers: PublicOrderOffer[]
}

/** يحسب السعر بعد الخصم لصنف معيّن إن وُجد عرض نشط عليه */
export function applyItemOffer(
  price: number,
  offer: PublicItemOffer | undefined
): { finalPrice: number; hasDiscount: boolean } {
  if (!offer) return { finalPrice: price, hasDiscount: false }
  const discounted =
    offer.discount_kind === 'percentage'
      ? price - (price * offer.discount_value) / 100
      : price - offer.discount_value
  return { finalPrice: Math.max(0, discounted), hasDiscount: true }
}

export function usePublicMenu(restaurantSlug: string) {
  return useQuery({
    queryKey: ['public-menu', restaurantSlug],
    queryFn: async (): Promise<PublicMenuData> => {
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, slug, name, name_ar')
        .eq('slug', restaurantSlug)
        .eq('is_active', true)
        .single()

      if (restaurantError || !restaurant) {
        throw new Error('لم يتم العثور على هذا المطعم.')
      }

      const [
        { data: branding },
        { data: categories, error: categoriesError },
        { data: offers, error: offersError },
      ] = await Promise.all([
        supabase
          .from('restaurant_branding')
          .select('primary_color, accent_color, theme_mode, menu_style, logo_path, style')
          .eq('restaurant_id', restaurant.id)
          .maybeSingle(),
        supabase
          .from('menu_categories')
          .select(
            'id, name, name_ar, sort_order, menu_items(id, category_id, name, name_ar, description, description_ar, price, image_path, is_available, sort_order)'
          )
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('offers')
          .select('id, title, title_ar, scope, discount_kind, discount_value, item_id, promo_code')
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true),
      ])

      if (categoriesError) throw categoriesError
      if (offersError) throw offersError

      const itemOffers: Record<string, PublicItemOffer> = {}
      const orderOffers: PublicOrderOffer[] = []

      for (const offer of offers ?? []) {
        if (offer.scope === 'item' && offer.item_id) {
          itemOffers[offer.item_id] = {
            id: offer.id,
            item_id: offer.item_id,
            discount_kind: offer.discount_kind,
            discount_value: offer.discount_value,
          }
        } else if (offer.scope === 'order' && offer.promo_code) {
          orderOffers.push({
            id: offer.id,
            title: offer.title,
            title_ar: offer.title_ar,
            promo_code: offer.promo_code,
            discount_kind: offer.discount_kind,
            discount_value: offer.discount_value,
          })
        }
      }

      const normalizedCategories: PublicMenuCategory[] = (categories ?? []).map(
        (cat) => ({
          id: cat.id,
          name: cat.name,
          name_ar: cat.name_ar,
          sort_order: cat.sort_order,
          items: ((cat.menu_items ?? []) as (PublicMenuItem & {
            is_available: boolean
            sort_order: number
          })[])
            .sort((a, b) => a.sort_order - b.sort_order),
        })
      )

      return {
        restaurant,
        branding: branding ?? null,
        categories: normalizedCategories.filter((c) => c.items.length > 0),
        itemOffers,
        orderOffers,
      }
    },
    retry: false,
  })
}
