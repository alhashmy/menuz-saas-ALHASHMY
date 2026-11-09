export interface DraftCategory {
  id: string
  name: string
  name_ar: string | null
  sort_order: number
  is_active: boolean
  _isNew?: boolean
  _isDeleted?: boolean
}

export interface DraftItem {
  id: string
  category_id: string
  name: string
  name_ar: string | null
  description: string | null
  price: number
  image_path: string | null
  is_available: boolean
  sort_order: number
  _isNew?: boolean
  _isDeleted?: boolean
}

export type MenuLayout = 'list' | 'grid-2' | 'grid-3' | 'cards'

export type NeonPlacement = 'cards' | 'strips' | 'all' | null

export interface MenuStyle {
  layout: MenuLayout
  accentColor: string
  bannerUrl: string | null
  neonEnabled: boolean
  neonPlacement: NeonPlacement
}

export interface MenuDraft {
  categories: DraftCategory[]
  items: DraftItem[]
  style: MenuStyle
}

export interface MenuBuilderPublishResult {
  ok: boolean
  error: string | null
}
