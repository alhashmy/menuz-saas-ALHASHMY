import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

export interface RestaurantBranding {
  restaurant_id: string
  logo_path: string | null
  cover_path: string | null
  primary_color: string
  accent_color: string
  theme_mode: 'light' | 'dark' | 'system'
  /** معرّف أحد قوالب المنيو العشرة الجاهزة، راجع MENU_TEMPLATES */
  menu_style: string
  font_family: string
}

export function useRestaurantBranding() {
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useQuery({
    queryKey: ['restaurant-branding', restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<RestaurantBranding> => {
      const { data, error } = await supabase
        .from('restaurant_branding')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .maybeSingle()
      if (error) throw error

      if (data) return data as RestaurantBranding

      // لا توجد صفوف هوية بعد لهذا المطعم -> أنشئ القيم الافتراضية
      const defaults = {
        restaurant_id: restaurantId!,
        primary_color: '#0ea5e9',
        accent_color: '#f97316',
        theme_mode: 'dark' as const,
        menu_style: 'classic-grid',
        font_family: 'Cairo',
      }
      const { data: created, error: insertError } = await supabase
        .from('restaurant_branding')
        .insert(defaults)
        .select()
        .single()
      if (insertError) throw insertError
      return created as RestaurantBranding
    },
  })
}

/** يتحقق من توفر slug قبل الحفظ (باستثناء المطعم الحالي نفسه) */
export function useCheckSlugAvailability() {
  return useMutation({
    mutationFn: async (input: { slug: string; excludeRestaurantId: string }) => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', input.slug)
        .neq('id', input.excludeRestaurantId)
        .maybeSingle()
      if (error) throw error
      return !data // true = متاح
    },
  })
}

export function useUpdateRestaurantSlug() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)
  const setRestaurant = useAuthStore((s) => s.setRestaurant)
  const restaurant = useAuthStore((s) => s.restaurant)

  return useMutation({
    mutationFn: async (slug: string) => {
      if (!restaurantId) throw new Error('لا يوجد مطعم مرتبط بالحساب الحالي.')
      const { error } = await supabase
        .from('restaurants')
        .update({ slug })
        .eq('id', restaurantId)
      if (error) {
        if (error.code === '23505') {
          throw new Error('هذا الرابط مستخدم بالفعل، جرّب رابطاً آخر.')
        }
        throw error
      }
      return slug
    },
    onSuccess: (slug) => {
      if (restaurant) setRestaurant({ ...restaurant, slug })
      queryClient.invalidateQueries({ queryKey: ['restaurant-branding', restaurantId] })
    },
  })
}

export function useUpdateBranding() {
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  return useMutation({
    mutationFn: async (input: Partial<RestaurantBranding>) => {
      if (!restaurantId) throw new Error('لا يوجد مطعم مرتبط بالحساب الحالي.')
      const { error } = await supabase
        .from('restaurant_branding')
        .update(input)
        .eq('restaurant_id', restaurantId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-branding', restaurantId] })
    },
  })
}
