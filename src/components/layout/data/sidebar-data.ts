import type { useLanguage } from '@/i18n'
import {
  BadgePercent,
  BarChart3,
  ClipboardList,
  Command,
  Grid,
  Layout,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Shield,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import type { SidebarData } from '../types'
import type { UserType, PlatformAdmin, RestaurantContext } from '@/stores/auth-store'
import type { User } from '@supabase/supabase-js'

type Translate = ReturnType<typeof useLanguage>['t']

interface CreateSidebarDataParams {
  t: Translate
  user: User | null
  platformAdmin: PlatformAdmin | null
  userType: UserType | null
  restaurant: RestaurantContext | null
}

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function getUserDisplayName(user: User | null, platformAdmin: PlatformAdmin | null, userType: UserType | null, restaurant: RestaurantContext | null): string {
  if (userType === 'root_owner') {
    return platformAdmin?.full_name || 'المالك الأعلى للنظام'
  }
  if (userType === 'sub_admin') {
    return platformAdmin?.full_name || 'مشرف مساعد'
  }
  if (userType === 'restaurant_owner' && restaurant) {
    return restaurant.name
  }
  return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'مستخدم'
}

function getUserDisplayRole(userType: UserType | null, restaurant: RestaurantContext | null): string {
  if (userType === 'root_owner') {
    return 'المالك الأعلى للنظام'
  }
  if (userType === 'sub_admin') {
    return 'مشرف مساعد'
  }
  if (userType === 'restaurant_owner' && restaurant) {
    return `مالك ${restaurant.name}`
  }
  return 'مستخدم'
}

export function createSidebarData({
  t,
  user,
  platformAdmin,
  userType,
  restaurant,
}: CreateSidebarDataParams): SidebarData {
  const navGroups = [
    {
      title: t('nav.workspace'),
      items: [
        {
          title: t('nav.dashboard'),
          url: '/dashboard',
          icon: LayoutDashboard,
        },
        { title: t('nav.orders'), url: '/orders', icon: ClipboardList },
        { title: t('nav.tables'), url: '/tables', icon: LayoutGrid },
        { title: t('nav.menu'), url: '/menu', icon: UtensilsCrossed },
        { title: t('nav.builder'), url: '/menu-builder', icon: Layout },
        { title: t('nav.offers'), url: '/offers', icon: BadgePercent },
      ],
    },
    {
      title: t('nav.restaurant'),
      items: [
        { title: t('nav.staff'), url: '/staff', icon: Users },
        { title: t('nav.analytics'), url: '/analytics', icon: BarChart3 },
        { title: t('nav.apps'), url: '/apps', icon: Grid },
      ],
    },
    {
      title: t('nav.settings'),
      items: [
        {
          title: t('nav.settings'),
          url: '/settings',
          icon: Settings,
        },
      ],
    },
  ]

  if (userType === 'root_owner' || userType === 'sub_admin') {
    navGroups.push({
      title: 'إدارة النظام',
      items: [
        {
          title: 'لوحة الإدارة العليا',
          url: '/super-admin',
          icon: Shield,
        },
      ],
    })
  }

  const displayName = getUserDisplayName(user, platformAdmin, userType, restaurant)
  const displayRole = getUserDisplayRole(userType, restaurant)
  const email = user?.email || ''
  const initials = getInitials(userType === 'root_owner' || userType === 'sub_admin' ? platformAdmin?.full_name : user?.user_metadata?.full_name, email)

  return {
    user: {
      name: displayName,
      email,
      avatar: '',
      role: displayRole,
      initials,
    },
    teams: [{ name: t('app.name'), logo: Command, plan: t('app.tagline') }],
    navGroups,
  }
}
