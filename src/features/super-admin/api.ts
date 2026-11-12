import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

function createSecondaryClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

import { supabase } from '@/lib/supabase'

export interface Restaurant {
  id: string
  slug: string
  name: string
  name_ar: string | null
  owner_id: string
  owner_email: string | null
  is_active: boolean
  subscription_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface SuperAdminStats {
  total_restaurants: number
  active_restaurants: number
  inactive_restaurants: number
  expired_subscriptions: number
  expiring_soon: number
}

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

export interface PlatformAdminStats {
  root_owners: number
  active_sub_admins: number
  inactive_sub_admins: number
}

export interface PlatformNotification {
  id: string
  restaurant_id: string
  admin_id: string
  title: string
  message: string
  type: 'subscription_warning' | 'urgent' | 'info' | 'chat'
  contact_url: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  restaurant?: Restaurant
}

export interface PasswordAuditLog {
  id: string
  target_user_id: string
  target_email: string
  entity_name: string | null
  new_password: string
  changed_by: string
  changed_by_email: string
  change_type: 'own_change' | 'root_reset' | 'initial_creation'
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface PasswordAuditStats {
  total_changes: number
  unread_changes: number
  own_changes: number
  root_resets: number
  initial_creations: number
}

export interface NotificationStats {
  total_notifications: number
  unread_notifications: number
  urgent_notifications: number
  subscription_warnings: number
}

export interface CreateRestaurantInput {
  name: string
  slug: string
  owner_email: string
  owner_password: string
  phone?: string
}

export interface CreatePlatformAdminInput {
  email: string
  password: string
  full_name: string
}

export interface UpdateRestaurantInput {
  is_active?: boolean
  subscription_ends_at?: string | null
}

export interface SendNotificationInput {
  restaurant_id: string
  title: string
  message: string
  type: 'subscription_warning' | 'urgent' | 'info' | 'chat'
  contact_url?: string
}

export async function fetchRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, slug, name, name_ar, owner_id, owner_email, is_active, subscription_ends_at, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchSuperAdminStats(): Promise<SuperAdminStats> {
  const { data, error } = await supabase
    .from('super_admin_stats')
    .select('total_restaurants, active_restaurants, inactive_restaurants, expired_subscriptions, expiring_soon')
    .maybeSingle()

  if (error) throw error
  return data ?? {
    total_restaurants: 0,
    active_restaurants: 0,
    inactive_restaurants: 0,
    expired_subscriptions: 0,
    expiring_soon: 0,
  }
}

export async function fetchPlatformAdmins(): Promise<PlatformAdmin[]> {
  const { data, error } = await supabase
    .from('platform_admins')
    .select('id, user_id, email, full_name, role, is_active, created_by, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchPlatformAdminStats(): Promise<PlatformAdminStats> {
  const { data, error } = await supabase
    .from('platform_admin_stats')
    .select('root_owners, active_sub_admins, inactive_sub_admins')
    .maybeSingle()

  if (error) throw error
  return data ?? {
    root_owners: 0,
    active_sub_admins: 0,
    inactive_sub_admins: 0,
  }
}

export async function fetchNotifications(): Promise<PlatformNotification[]> {
  const { data, error } = await supabase
    .from('platform_notifications')
    .select(`
      id, restaurant_id, admin_id, title, message, type, contact_url, is_read, read_at, created_at,
      restaurant:restaurants(id, slug, name, name_ar, owner_email, is_active, subscription_ends_at, created_at)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  if (!data) return []

  interface NotificationWithRestaurantArray {
    id: string
    restaurant_id: string
    admin_id: string
    title: string
    message: string
    type: 'subscription_warning' | 'urgent' | 'info' | 'chat'
    contact_url: string | null
    is_read: boolean
    read_at: string | null
    created_at: string
    restaurant: Array<{
      id: string
      slug: string
      name: string
      name_ar: string | null
      owner_email: string | null
      is_active: boolean
      subscription_ends_at: string | null
      created_at: string
    }> | null
  }

  return data.map((notification: NotificationWithRestaurantArray) => ({
    ...notification,
    restaurant: notification.restaurant?.[0] ?? null,
  })) as PlatformNotification[]
}

export async function fetchNotificationStats(): Promise<NotificationStats> {
  const { data, error } = await supabase
    .from('platform_notification_stats')
    .select('total_notifications, unread_notifications, urgent_notifications, subscription_warnings')
    .maybeSingle()

  if (error) throw error
  return data ?? {
    total_notifications: 0,
    unread_notifications: 0,
    urgent_notifications: 0,
    subscription_warnings: 0,
  }
}

export function useRestaurants() {
  return useQuery({
    queryKey: ['super-admin', 'restaurants'],
    queryFn: fetchRestaurants,
    retry: false,
  })
}

export function useSuperAdminStats() {
  return useQuery({
    queryKey: ['super-admin', 'stats'],
    queryFn: fetchSuperAdminStats,
    retry: false,
  })
}

export function usePlatformAdmins() {
  return useQuery({
    queryKey: ['super-admin', 'platform-admins'],
    queryFn: fetchPlatformAdmins,
    retry: false,
  })
}

export function usePlatformAdminStats() {
  return useQuery({
    queryKey: ['super-admin', 'platform-admin-stats'],
    queryFn: fetchPlatformAdminStats,
    retry: false,
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: ['super-admin', 'notifications'],
    queryFn: fetchNotifications,
    retry: false,
  })
}

export function useNotificationStats() {
  return useQuery({
    queryKey: ['super-admin', 'notification-stats'],
    queryFn: fetchNotificationStats,
    retry: false,
  })
}

export function useToggleRestaurantActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('restaurants')
        .update({ is_active: isActive })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? 'تم تفعيل المطعم' : 'تم إيقاف المطعم')
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'restaurants'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'stats'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث حالة المطعم')
    },
  })
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateRestaurantInput }) => {
      const { error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('تم تحديث بيانات المطعم')
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'restaurants'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'stats'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث بيانات المطعم')
    },
  })
}

export function useCreateRestaurant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateRestaurantInput) => {
      const secondaryClient = createSecondaryClient()

      const { data: authData, error: authError } = await secondaryClient.auth.signUp({
        email: input.owner_email,
        password: input.owner_password,
        options: {
          data: {
            role: 'owner',
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('فشل إنشاء حساب المالك')

      const userId = authData.user.id

      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: input.name,
          slug: input.slug,
          owner_id: userId,
          owner_email: input.owner_email,
          is_active: true,
        })
        .select()
        .single()

      if (restaurantError) {
        throw restaurantError
      }

      const { error: staffError } = await supabase
        .from('restaurant_staff')
        .insert({
          restaurant_id: restaurant.id,
          user_id: userId,
          role: 'owner',
        })

      if (staffError) {
        await supabase.from('restaurants').delete().eq('id', restaurant.id)
        throw staffError
      }

      const { error: brandingError } = await supabase
        .from('restaurant_branding')
        .insert({
          restaurant_id: restaurant.id,
        })

      if (brandingError) {
        await supabase.from('restaurant_staff').delete().eq('restaurant_id', restaurant.id)
        await supabase.from('restaurants').delete().eq('id', restaurant.id)
        throw brandingError
      }

      // Log initial password for the restaurant owner
      const { error: logError } = await supabase.rpc('log_initial_password', {
        p_target_user_id: userId,
        p_target_email: input.owner_email,
        p_new_password: input.owner_password,
        p_entity_name: input.name,
      })

      if (logError) {
        console.error('Failed to log initial password:', logError)
      }

      return restaurant
    },
    onSuccess: () => {
      toast.success('تم إنشاء المطعم وحساب المالك بنجاح')
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'restaurants'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'password-audit-logs'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'password-audit-stats'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء المطعم')
    },
  })
}

export function useCreatePlatformAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePlatformAdminInput) => {
      const secondaryClient = createSecondaryClient()

      const { data: authData, error: authError } = await secondaryClient.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            full_name: input.full_name,
            role: 'sub_admin',
            platform_admin: true,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('فشل إنشاء حساب المشرف')

      const userId = authData.user.id

      const { data: admin, error: adminError } = await supabase
        .from('platform_admins')
        .insert({
          user_id: userId,
          email: input.email,
          full_name: input.full_name,
          role: 'sub_admin',
          is_active: true,
        })
        .select()
        .single()

      if (adminError) {
        throw adminError
      }

      // Log initial password for the platform admin
      const { error: logError } = await supabase.rpc('log_initial_password', {
        p_target_user_id: userId,
        p_target_email: input.email,
        p_new_password: input.password,
        p_entity_name: input.full_name,
      })

      if (logError) {
        console.error('Failed to log initial password:', logError)
      }

      return admin
    },
    onSuccess: () => {
      toast.success('تم إنشاء المشرف بنجاح')
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'platform-admins'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'platform-admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'password-audit-logs'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'password-audit-stats'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء المشرف')
    },
  })
}

export function useTogglePlatformAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('platform_admins')
        .update({ is_active: isActive })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? 'تم تفعيل المشرف' : 'تم إيقاف المشرف')
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'platform-admins'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'platform-admin-stats'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث حالة المشرف')
    },
  })
}

export function useDeletePlatformAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: admin, error: fetchError } = await supabase
        .from('platform_admins')
        .select('user_id, role')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (admin.role === 'root_owner') throw new Error('لا يمكن حذف المالك الأعلى')

      const { error } = await supabase
        .from('platform_admins')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Note: Cannot delete auth user without admin API
    },
    onSuccess: () => {
      toast.success('تم حذف المشرف')
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'platform-admins'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'platform-admin-stats'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف المشرف')
    },
  })
}

export function useDeleteRestaurant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('تم حذف المطعم')
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'restaurants'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'stats'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف المطعم')
    },
  })
}

export function useSendNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SendNotificationInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('platform_notifications')
        .insert({
          restaurant_id: input.restaurant_id,
          admin_id: user?.id,
          title: input.title,
          message: input.message,
          type: input.type,
          contact_url: input.contact_url,
        })

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('تم إرسال الإشعار بنجاح')
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'notifications'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'notification-stats'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر إرسال الإشعار')
    },
  })
}

export async function fetchPasswordAuditLogs(): Promise<PasswordAuditLog[]> {
  const { data, error } = await supabase
    .from('password_audit_logs')
    .select('id, target_user_id, target_email, entity_name, new_password, changed_by, changed_by_email, change_type, is_read, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw error
  return data ?? []
}

export async function fetchPasswordAuditStats(): Promise<PasswordAuditStats> {
  const { data, error } = await supabase
    .from('password_audit_stats')
    .select('total_changes, unread_changes, own_changes, root_resets, initial_creations')
    .maybeSingle()

  if (error) throw error
  return data ?? {
    total_changes: 0,
    unread_changes: 0,
    own_changes: 0,
    root_resets: 0,
    initial_creations: 0,
  }
}

export function usePasswordAuditLogs() {
  return useQuery({
    queryKey: ['super-admin', 'password-audit-logs'],
    queryFn: fetchPasswordAuditLogs,
    retry: false,
  })
}

export function usePasswordAuditStats() {
  return useQuery({
    queryKey: ['super-admin', 'password-audit-stats'],
    queryFn: fetchPasswordAuditStats,
    retry: false,
  })
}

export function useRootResetPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ targetUserId, newPassword, entityName }: { targetUserId: string; newPassword: string; entityName: string }) => {
      const { error } = await supabase.rpc('root_reset_user_password', {
        p_target_user_id: targetUserId,
        p_new_password: newPassword,
        p_entity_name: entityName,
      })

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('تم إعادة تعيين كلمة المرور بنجاح')
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'password-audit-logs'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'password-audit-stats'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر إعادة تعيين كلمة المرور')
    },
  })
}

export function useMarkPasswordAuditRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('password_audit_logs')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'password-audit-logs'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'password-audit-stats'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث حالة القراءة')
    },
  })
}

export function useRootChangeOwnPassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('لم يتم العثور على المستخدم')

      const { error } = await supabase.rpc('root_reset_user_password', {
        p_target_user_id: user.id,
        p_new_password: newPassword,
        p_entity_name: 'حساب المالك الأعلى',
      })

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور بنجاح')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'تعذر تغيير كلمة المرور')
    },
  })
}