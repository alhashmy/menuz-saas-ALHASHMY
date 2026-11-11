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
  description: string | null
  is_open: boolean
  google_maps_url: string | null
  waze_url: string | null
}

export interface OperatingHours {
  day_of_week: number
  is_open: boolean
  opens_at: string | null
  closes_at: string | null
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
    menuTemplate?:
      | 'aurora'
      | 'noir'
      | 'souk'
      | 'volt'
      | 'bustan'
      | 'ivory'
      | 'neon'
      | 'majesty'
      | 'cafe'
      | 'market'
      | 'modern'
      | 'delivery'
      | 'delivery-app'
    layoutTemplate: 'grid-cards' | 'visual-categories' | 'list-categories'
    themeMode: 'light' | 'dark'
    accentColor: string
    secondaryColor?: string
    gradientAngle?: number
    backgroundColor?: string
    neonLineEnabled?: boolean
    socialLinks?: {
      whatsapp: string
      instagram: string
      facebook: string
      tiktok: string
    }
    socialVisibility?: {
      whatsapp: boolean
      instagram: boolean
      facebook: boolean
      tiktok: boolean
    }
    entryAdEnabled?: boolean
    entryAdImageUrl?: string | null
    entryAdTitle?: string
    entryAdMessage?: string
    isOpen: boolean
    bannerUrls: string[]
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
  operatingHours: OperatingHours[]
  branding: PublicBranding | null
  categories: PublicMenuCategory[]
  /** خصومات على أصناف محددة، مفتاحها item_id لتسهيل الوصول السريع */
  itemOffers: Record<string, PublicItemOffer>
  /** أكواد برومو فعّالة على كامل الطلب */
  orderOffers: PublicOrderOffer[]
}

const baghdadWeekdays: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

function timeToMinutes(value: string | null) {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  return hours * 60 + minutes
}

/** Mirrors `restaurant_is_accepting_orders` using Iraq local time for immediate UI feedback. */
export function isRestaurantAcceptingOrders(
  restaurantIsOpen: boolean,
  operatingHours: OperatingHours[],
  now = new Date()
) {
  if (!restaurantIsOpen) return false

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Baghdad',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value
  const day = baghdadWeekdays[part('weekday') ?? '']
  const currentMinutes = Number(part('hour')) * 60 + Number(part('minute'))
  if (day === undefined || !Number.isFinite(currentMinutes))
    return restaurantIsOpen

  const today = operatingHours.find((hours) => hours.day_of_week === day)
  const yesterday = operatingHours.find(
    (hours) => hours.day_of_week === (day + 6) % 7
  )
  const yesterdayOpens = timeToMinutes(yesterday?.opens_at ?? null)
  const yesterdayCloses = timeToMinutes(yesterday?.closes_at ?? null)

  // A shift that crosses midnight remains open until yesterday's closing time.
  if (
    yesterday?.is_open &&
    yesterdayOpens !== null &&
    yesterdayCloses !== null &&
    yesterdayCloses <= yesterdayOpens &&
    currentMinutes < yesterdayCloses
  ) {
    return true
  }

  // No entry means the manual `is_open` switch controls ordering for that day.
  if (!today) return true
  if (!today.is_open) return false

  const opensAt = timeToMinutes(today.opens_at)
  const closesAt = timeToMinutes(today.closes_at)
  if (opensAt === null || closesAt === null) return false
  if (closesAt > opensAt) {
    return currentMinutes >= opensAt && currentMinutes < closesAt
  }
  return currentMinutes >= opensAt
}

/** يحسب السعر بعد الخصم لصنف معيّن إن وُجد عرض نشط عليه */
export function applyItemOffer(
  price: number,
  offer: PublicItemOffer | undefined
): { finalPrice: number; hasDiscount: boolean } {
  const safePrice = Number.isFinite(price) && price >= 0 ? price : 0
  if (!offer) return { finalPrice: safePrice, hasDiscount: false }
  const discounted =
    offer.discount_kind === 'percentage'
      ? safePrice - (safePrice * offer.discount_value) / 100
      : safePrice - offer.discount_value
  return { finalPrice: Math.max(0, discounted), hasDiscount: true }
}

export function usePublicMenu(restaurantSlug: string) {
  return useQuery({
    queryKey: ['public-menu', restaurantSlug],
    queryFn: async (): Promise<PublicMenuData> => {
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select(
          'id, slug, name, name_ar, description, is_open, google_maps_url, waze_url'
        )
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
        { data: operatingHours, error: operatingHoursError },
      ] = await Promise.all([
        supabase
          .from('restaurant_branding')
          .select(
            'primary_color, accent_color, theme_mode, menu_style, logo_path, style'
          )
          .eq('restaurant_id', restaurant.id)
          .maybeSingle(),
        supabase
          .from('menu_categories')
          .select(
            'id, name, name_ar, sort_order, menu_items(id, category_id, name, name_ar, description, description_ar, price, image_path, is_available, sort_order)'
          )
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true)
          .eq('menu_items.is_available', true)
          .order('sort_order'),
        supabase
          .from('offers')
          .select(
            'id, title, title_ar, scope, discount_kind, discount_value, item_id, promo_code, starts_at, expires_at'
          )
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true),
        supabase
          .from('restaurant_operating_hours')
          .select('day_of_week, is_open, opens_at, closes_at')
          .eq('restaurant_id', restaurant.id),
      ])

      if (categoriesError) throw categoriesError
      if (offersError) throw offersError
      if (operatingHoursError) throw operatingHoursError

      const itemOffers: Record<string, PublicItemOffer> = {}
      const orderOffers: PublicOrderOffer[] = []

      const now = Date.now()
      for (const offer of offers ?? []) {
        // لا نظهر العروض المؤجلة أو المنتهية حتى لو كان الصف فعّالاً بالخطأ.
        const startsAt =
          'starts_at' in offer && offer.starts_at
            ? Date.parse(offer.starts_at as string)
            : null
        const endsAt =
          'expires_at' in offer && offer.expires_at
            ? Date.parse(offer.expires_at as string)
            : null
        if ((startsAt && startsAt > now) || (endsAt && endsAt < now)) continue
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
          items: (
            (cat.menu_items ?? []) as (PublicMenuItem & {
              is_available: boolean
              sort_order: number
            })[]
          ).sort((a, b) => a.sort_order - b.sort_order),
        })
      )

      return {
        restaurant,
        operatingHours: (operatingHours ?? []) as OperatingHours[],
        branding: branding ?? null,
        categories: normalizedCategories.filter((c) => c.items.length > 0),
        itemOffers,
        orderOffers,
      }
    },
    retry: false,
  })
}
