export type OfferScope = 'item' | 'order'
export type DiscountKind = 'percentage' | 'fixed'

export interface Offer {
  id: string
  restaurant_id: string
  title: string
  title_ar: string | null
  scope: OfferScope
  discount_kind: DiscountKind
  discount_value: number
  item_id: string | null
  promo_code: string | null
  is_active: boolean
  created_at: string
}
