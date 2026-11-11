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
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import type { SidebarData } from '../types'

type Translate = ReturnType<typeof useLanguage>['t']

export function createSidebarData(t: Translate): SidebarData {
  return {
    user: {
      name: 'Restaurant owner',
      email: 'owner@menuz.app',
      avatar: '/avatars/shadcn.jpg',
    },
    teams: [{ name: t('app.name'), logo: Command, plan: t('app.tagline') }],
    navGroups: [
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
            icon: Settings,
            items: [
              {
                title: t('nav.orderSettings'),
                url: '/settings/restaurant-ordering',
              },
            ],
          },
        ],
      },
    ],
  }
}
