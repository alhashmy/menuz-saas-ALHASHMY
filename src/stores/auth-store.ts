import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'staff'

export interface RestaurantContext {
  id: string
  slug: string
  name: string
  role: StaffRole
  is_active: boolean
  subscription_ends_at: string | null
}

export interface PlatformNotification {
  id: string
  title: string
  message: string
  type: 'subscription_warning' | 'urgent' | 'info' | 'chat'
  contact_url: string | null
  is_read: boolean
  created_at: string
}

export type UserType = 'root_owner' | 'sub_admin' | 'restaurant_owner'

export interface PlatformAdmin {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: 'root_owner' | 'sub_admin'
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

interface AuthState {
  user: User | null
  session: Session | null
  restaurant: RestaurantContext | null
  platformAdmin: PlatformAdmin | null
  userType: UserType | null
  notifications: PlatformNotification[]
  unreadCount: number
  isLoading: boolean
  isInitialized: boolean

  setSession: (session: Session | null) => void
  setRestaurant: (restaurant: RestaurantContext | null) => void
  setPlatformAdmin: (platformAdmin: PlatformAdmin | null) => void
  setNotifications: (notifications: PlatformNotification[]) => void
  markNotificationRead: (id: string) => Promise<void>
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
  loadPlatformAdmin: () => Promise<void>
  loadNotifications: () => Promise<void>
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  restaurant: null,
  platformAdmin: null,
  userType: null,
  notifications: [],
  unreadCount: 0,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => set({ session, user: session?.user ?? null }),

  setRestaurant: (restaurant) => set({ restaurant }),

  setPlatformAdmin: (platformAdmin) => {
    const userType = platformAdmin
      ? platformAdmin.role === 'root_owner'
        ? 'root_owner'
        : 'sub_admin'
      : 'restaurant_owner'
    set({ platformAdmin, userType })
  },

  setNotifications: (notifications) => {
    const unread = notifications.filter((n) => !n.is_read).length
    set({ notifications, unreadCount: unread })
  },

  markNotificationRead: async (id) => {
    const { error } = await supabase
      .from('platform_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    }
  },

  signInWithPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) return { error: error.message }
    get().setSession(data.session)
    await get().loadRestaurantContext()
    await get().loadPlatformAdmin()
    await get().loadNotifications()
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
    await get().loadPlatformAdmin()
    await get().loadNotifications()
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, restaurant: null, platformAdmin: null, userType: null, notifications: [], unreadCount: 0 })
  },

  loadRestaurantContext: async () => {
    const userId = get().user?.id
    if (!userId) {
      set({ restaurant: null })
      return
    }

    const { data, error } = await supabase
      .from('restaurant_staff')
      .select('role, restaurants(id, slug, name, is_active, subscription_ends_at)')
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
      is_active: boolean
      subscription_ends_at: string | null
    }

    set({
      restaurant: {
        id: r.id,
        slug: r.slug,
        name: r.name,
        role: data.role as StaffRole,
        is_active: r.is_active,
        subscription_ends_at: r.subscription_ends_at,
      },
    })
  },

  loadPlatformAdmin: async () => {
    const userId = get().user?.id
    if (!userId) {
      set({ platformAdmin: null, userType: 'restaurant_owner' })
      return
    }

    const { data, error } = await supabase
      .from('platform_admins')
      .select('id, user_id, email, full_name, role, is_active, created_by, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      set({ platformAdmin: null, userType: 'restaurant_owner' })
      return
    }

    const platformAdmin = data as PlatformAdmin
    const userType = platformAdmin.role === 'root_owner' ? 'root_owner' : 'sub_admin'
    set({ platformAdmin, userType })
  },

  loadNotifications: async () => {
    const restaurantId = get().restaurant?.id
    if (!restaurantId) {
      set({ notifications: [], unreadCount: 0 })
      return
    }

    const { data, error } = await supabase
      .from('platform_notifications')
      .select('id, title, message, type, contact_url, is_read, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      set({ notifications: [], unreadCount: 0 })
      return
    }

    const notifications = (data ?? []) as PlatformNotification[]
    const unread = notifications.filter((n) => !n.is_read).length
    set({ notifications, unreadCount: unread })
  },

  init: async () => {
    const { data } = await supabase.auth.getSession()
    get().setSession(data.session)
    if (data.session) {
      await get().loadRestaurantContext()
      await get().loadPlatformAdmin()
      await get().loadNotifications()
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      get().setSession(session)
      if (session) {
        void get().loadRestaurantContext()
        void get().loadPlatformAdmin()
        void get().loadNotifications()
      } else {
        set({ restaurant: null, platformAdmin: null, userType: null, notifications: [], unreadCount: 0 })
      }
    })

    set({ isLoading: false, isInitialized: true })
  },
}))
