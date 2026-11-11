import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Create a .env file based on .env.example and restart the dev server.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/** يبني رابط صورة عام من مسار داخل bucket menu-images */
export function getMenuImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('https://') || path.startsWith('http://')) return path
  const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
  return data.publicUrl
}

/** يرفع صورة إلى bucket menu-images ضمن مجلد المطعم ويعيد المسار المخزَّن */
export async function uploadMenuImage(
  restaurantId: string,
  folder: 'items' | 'branding',
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${restaurantId}/${folder}/img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`

  const { error } = await supabase.storage
    .from('menu-images')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error
  return path
}
