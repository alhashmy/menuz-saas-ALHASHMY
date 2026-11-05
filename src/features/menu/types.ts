export interface MenuCategory {
  id: string
  restaurant_id: string
  name: string
  name_ar: string | null
  sort_order: number
  is_active: boolean
}

export interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  name_ar: string | null
  description: string | null
  description_ar: string | null
  price: number
  image_path: string | null
  is_available: boolean
  sort_order: number
}
