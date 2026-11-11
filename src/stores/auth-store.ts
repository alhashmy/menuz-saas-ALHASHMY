import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'staff'

export interface RestaurantContext {
  id: string
  slug: string
  name: string
  role: StaffRole
}

interface AuthState {
  user: User | null
  session: Session | null
  restaurant: RestaurantContext | null
  isLoading: boolean
  isInitialized: boolean

  setSession: (session: Session | null) => void
  setRestaurant: (restaurant: RestaurantContext | null) => void
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>
  signUpWithPassword: (
    email: string,
    password: string,
    restaurantName: string
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  loadRestaurantContext: () => Promise<void>
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  restaurant: null,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => set({ session, user: session?.user ?? null }),

  setRestaurant: (restaurant) => set({ restaurant }),

  signInWithPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) return { error: error.message }
    get().setSession(data.session)
    await get().loadRestaurantContext()
    return { error: null }
  },

  signUpWithPassword: async (email, password, restaurantName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) return { error: error.message }
    if (!data.user) return { error: 'تعذر إنشاء الحساب، حاول مرة أخرى.' }

    // إنشاء مطعم جديد وربط المستخدم كمالك (owner) له
    const slug = restaurantName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '')
      .replace(/\s+/g, '-')
      .concat('-', data.user.id.slice(0, 6))

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({ name: restaurantName, slug, owner_id: data.user.id })
      .select()
      .single()

    if (restaurantError) return { error: restaurantError.message }

    const { error: staffError } = await supabase
      .from('restaurant_staff')
      .insert({
        restaurant_id: restaurant.id,
        user_id: data.user.id,
        role: 'owner',
      })

    if (staffError) return { error: staffError.message }

    get().setSession(data.session)
    await get().loadRestaurantContext()
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, restaurant: null })
  },

  loadRestaurantContext: async () => {
    const userId = get().user?.id
    if (!userId) {
      set({ restaurant: null })
      return
    }

    const { data, error } = await supabase
      .from('restaurant_staff')
      .select('role, restaurants(id, slug, name)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (error || !data || !data.restaurants) {
      set({ restaurant: null })
      return
    }

    const r = data.restaurants as unknown as {
      id: string
      slug: string
      name: string
    }

    set({
      restaurant: {
        id: r.id,
        slug: r.slug,
        name: r.name,
        role: data.role as StaffRole,
      },
    })
  },

  init: async () => {
    const { data } = await supabase.auth.getSession()
    get().setSession(data.session)
    if (data.session) await get().loadRestaurantContext()

    supabase.auth.onAuthStateChange((_event, session) => {
      get().setSession(session)
      if (session) {
        void get().loadRestaurantContext()
      } else {
        set({ restaurant: null })
      }
    })

    set({ isLoading: false, isInitialized: true })
  },
}))
