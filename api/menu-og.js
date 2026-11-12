import { createClient } from '@supabase/supabase-js'

function escapeHtml(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;')
}

async function fetchRestaurantData(slug, supabase) {
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

  return { restaurant: data, branding }
}

function getFullImageUrl(path, origin) {
  if (!path) return `${origin}/images/menuz-og-default.png`
  if (path.startsWith('http')) return path
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
}

function generateOGHtml(html, restaurant, branding, slug, origin) {
  const restaurantName = restaurant.name_ar ?? restaurant.name
  const description = restaurant.description_ar ?? restaurant.description ?? 'منيو رقمي احترافي لمطعمك'
  const logoUrl = getFullImageUrl(branding?.logo_path ?? restaurant.logo_path, origin)
  const ogUrl = `${origin}/menu/${slug}`

  const safeName = escapeHtml(restaurantName)
  const safeDescription = escapeHtml(description)
  const safeLogoUrl = escapeHtml(logoUrl)
  const safeOgUrl = escapeHtml(ogUrl)

  const replacements = {
    '<title>Menuz - نظام المنيو الإلكتروني الذكي</title>':
      `<title>${safeName} - منيو رقمي | Menuz</title>`,
    '<meta name="title" content="Menuz - نظام المنيو الإلكتروني الذكي" />':
      `<meta name="title" content="${safeName} - منيو رقمي | Menuz" />`,
    '<meta name="description" content="منصة Menuz لإدارة المنيو الرقمي والطلبات. اصنع منيو احترافي لمطعمك مع أكواد QR، الطلبات عبر واتساب، والتوصيل." />':
      `<meta name="description" content="${safeDescription}" />`,
    '<meta property="og:url" content="https://menuz.app" />':
      `<meta property="og:url" content="${safeOgUrl}" />`,
    '<meta property="og:title" content="Menuz - نظام المنيو الإلكتروني الذكي" />':
      `<meta property="og:title" content="${safeName} - منيو رقمي" />`,
    '<meta property="og:description" content="منصة Menuz لإدارة المنيو الرقمي والطلبات. اصنع منيو احترافي لمطعمك مع أكواد QR، الطلبات عبر واتساب، والتوصيل." />':
      `<meta property="og:description" content="${safeDescription}" />`,
    '<meta property="og:image" content="https://menuz.app/images/menuz-og-default.png" />':
      `<meta property="og:image" content="${safeLogoUrl}" />`,
    '<meta property="twitter:url" content="https://menuz.app" />':
      `<meta property="twitter:url" content="${safeOgUrl}" />`,
    '<meta property="twitter:title" content="Menuz - نظام المنيو الإلكتروني الذكي" />':
      `<meta property="twitter:title" content="${safeName} - منيو رقمي" />`,
    '<meta property="twitter:description" content="منصة Menuz لإدارة المنيو الرقمي والطلبات. اصنع منيو احترافي لمطعمك مع أكواد QR، الطلبات عبر واتساب، والتوصيل." />':
      `<meta property="twitter:description" content="${safeDescription}" />`,
    '<meta property="twitter:image" content="https://menuz.app/images/menuz-og-default.png" />':
      `<meta property="twitter:image" content="${safeLogoUrl}" />`,
  }

  let result = html
  for (const [search, replace] of Object.entries(replacements)) {
    result = result.replace(search, replace)
  }

  return result
}

export default async function handler(req) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug') || url.pathname.replace('/api/menu-og/', '').replace('/menu/', '')

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'menuz.app'
  const origin = `${proto}://${host}`

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response('Supabase configuration missing', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    let indexHtml
    try {
      const response = await fetch(`${origin}/index.html`, {
        headers: { 'User-Agent': 'Menuz-OG-Bot/1.0' },
      })
      if (!response.ok) throw new Error('Failed to fetch index.html')
      indexHtml = await response.text()
    } catch {
      indexHtml = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>Menuz - نظام المنيو الإلكتروني الذكي</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div></body></html>`
    }

    const data = await fetchRestaurantData(slug, supabase)

    if (!data) {
      return new Response(indexHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const html = generateOGHtml(indexHtml, data.restaurant, data.branding, slug, origin)

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch {
    return new Response(indexHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}