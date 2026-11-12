import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const INDEX_HTML_PATH = join(process.cwd(), 'dist', 'index.html')

interface Restaurant {
  id: string
  name: string
  name_ar: string | null
  slug: string
  description: string | null
  description_ar: string | null
  logo_path: string | null
  google_maps_url: string | null
  waze_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
  website_url: string | null
  whatsapp_number: string | null
  is_open: boolean
}

interface Branding {
  style: Record<string, unknown>
  logo_path: string | null
  menu_style: string | null
  theme_mode: string | null
}

async function fetchRestaurantData(slug: string): Promise<{ restaurant: Restaurant; branding: Branding | null } | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(
      'id, name, name_ar, slug, description, description_ar, logo_path, google_maps_url, waze_url, instagram_url, facebook_url, tiktok_url, website_url, whatsapp_number, is_open'
    )
    .eq('slug', slug)
    .single()

  if (error || !data) return null

  const { data: branding } = await supabase
    .from('restaurant_branding')
    .select('style, logo_path, menu_style, theme_mode')
    .eq('restaurant_id', data.id)
    .single()

  return { restaurant: data as Restaurant, branding: branding as Branding | null }
}

function getFullImageUrl(path: string | null | undefined): string {
  if (!path) return 'https://menuz.app/images/menuz-og-default.png'
  if (path.startsWith('http')) return path
  return `https://menuz.app${path.startsWith('/') ? '' : '/'}${path}`
}

function generateOGHtml(restaurant: Restaurant, branding: Branding | null, slug: string): string {
  let html = readFileSync(INDEX_HTML_PATH, 'utf-8')

  const restaurantName = restaurant.name_ar ?? restaurant.name
  const description = restaurant.description_ar ?? restaurant.description ?? 'منيو رقمي احترافي لمطعمك'
  const logoUrl = getFullImageUrl(branding?.logo_path ?? restaurant.logo_path)
  const ogUrl = `https://menuz.app/menu/${slug}`

  const replacements: Record<string, string> = {
    '<title>Menuz - نظام المنيو الإلكتروني الذكي</title>':
      `<title>${restaurantName} - منيو رقمي | Menuz</title>`,
    '<meta name="title" content="Menuz - نظام المنيو الإلكتروني الذكي" />':
      `<meta name="title" content="${restaurantName} - منيو رقمي | Menuz" />`,
    '<meta name="description" content="منصة Menuz لإدارة المنيو الرقمي والطلبات. اصنع منيو احترافي لمطعمك مع أكواد QR، الطلبات عبر واتساب، والتوصيل." />':
      `<meta name="description" content="${description}" />`,
    '<meta property="og:url" content="https://menuz.app" />':
      `<meta property="og:url" content="${ogUrl}" />`,
    '<meta property="og:title" content="Menuz - نظام المنيو الإلكتروني الذكي" />':
      `<meta property="og:title" content="${restaurantName} - منيو رقمي" />`,
    '<meta property="og:description" content="منصة Menuz لإدارة المنيو الرقمي والطلبات. اصنع منيو احترافي لمطعمك مع أكواد QR، الطلبات عبر واتساب، والتوصيل." />':
      `<meta property="og:description" content="${description}" />`,
    '<meta property="og:image" content="https://menuz.app/images/menuz-og-default.png" />':
      `<meta property="og:image" content="${logoUrl}" />`,
    '<meta property="twitter:url" content="https://menuz.app" />':
      `<meta property="twitter:url" content="${ogUrl}" />`,
    '<meta property="twitter:title" content="Menuz - نظام المنيو الإلكتروني الذكي" />':
      `<meta property="twitter:title" content="${restaurantName} - منيو رقمي" />`,
    '<meta property="twitter:description" content="منصة Menuz لإدارة المنيو الرقمي والطلبات. اصنع منيو احترافي لمطعمك مع أكواد QR، الطلبات عبر واتساب، والتوصيل." />':
      `<meta property="twitter:description" content="${description}" />`,
    '<meta property="twitter:image" content="https://menuz.app/images/menuz-og-default.png" />':
      `<meta property="twitter:image" content="${logoUrl}" />`,
  }

  for (const [search, replace] of Object.entries(replacements)) {
    html = html.replace(search, replace)
  }

  return html
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const slug = url.pathname.replace('/api/menu-og/', '').replace('/menu/', '')

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  try {
    const data = await fetchRestaurantData(slug)

    if (!data) {
      // Return default index.html if restaurant not found
      const html = readFileSync(INDEX_HTML_PATH, 'utf-8')
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const html = generateOGHtml(data.restaurant, data.branding, slug)

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch {
    const html = readFileSync(INDEX_HTML_PATH, 'utf-8')
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}