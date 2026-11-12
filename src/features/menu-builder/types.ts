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

export type LayoutTemplate = 'grid-cards' | 'visual-categories' | 'list-categories'
export type MenuTemplateId =
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
  | 'delivery-app'

/** القوالب الأساسية لها هوية ثابتة ولا تسمح بتغيير التخطيط أو لوحة الألوان. */
export const LOCKED_MENU_TEMPLATE_IDS = [
  'aurora', 'noir', 'souk', 'volt', 'bustan', 'ivory',
] as const satisfies readonly MenuTemplateId[]

export function isLockedMenuTemplate(template: MenuTemplateId) {
  return (LOCKED_MENU_TEMPLATE_IDS as readonly MenuTemplateId[]).includes(template)
}

export interface MenuStyle {
  menuTemplate: MenuTemplateId
  layoutTemplate: LayoutTemplate
  themeMode: 'light' | 'dark'
  accentColor: string
  secondaryColor: string
  gradientAngle: number
  backgroundColor: string
  neonLineEnabled: boolean
  socialLinks: {
    whatsapp: string
    instagram: string
    facebook: string
    tiktok: string
  }
  socialVisibility: {
    whatsapp: boolean
    instagram: boolean
    facebook: boolean
    tiktok: boolean
  }
  entryAdEnabled: boolean
  entryAdImageUrl: string | null
  entryAdTitle: string
  entryAdMessage: string
  isOpen: boolean
  bannerUrls: string[]
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
