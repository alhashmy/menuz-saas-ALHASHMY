import {
  LayoutDashboard,
  ClipboardList,
  LayoutGrid,
  UtensilsCrossed,
  BadgePercent,
  Palette,
  Users,
  BarChart3,
  QrCode,
  Settings,
  Command,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'مالك المطعم',
    email: 'owner@menuz.app',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Menuz',
      logo: Command,
      plan: 'نظام تشغيل المطاعم',
    },
  ],
  navGroups: [
    {
      title: 'الرئيسية',
      items: [
        {
          title: 'نظرة عامة',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          title: 'الطلبات',
          url: '/orders',
          icon: ClipboardList,
        },
        {
          title: 'الطاولات',
          url: '/tables',
          icon: LayoutGrid,
        },
        {
          title: 'القائمة',
          url: '/menu',
          icon: UtensilsCrossed,
        },
        {
          title: 'العروض',
          url: '/offers',
          icon: BadgePercent,
        },
      ],
    },
    {
      title: 'المطعم',
      items: [
        {
          title: 'الهوية البصرية',
          url: '/branding',
          icon: Palette,
        },
        {
          title: 'الموظفون',
          url: '/staff',
          icon: Users,
        },
        {
          title: 'التحليلات',
          url: '/analytics',
          icon: BarChart3,
        },
        {
          title: 'أكواد QR',
          url: '/qr-codes',
          icon: QrCode,
        },
      ],
    },
    {
      title: 'أخرى',
      items: [
        {
          title: 'الإعدادات',
          icon: Settings,
          items: [
            { title: 'الملف الشخصي', url: '/settings' },
            { title: 'الحساب', url: '/settings/account' },
            { title: 'إعدادات الطلبات', url: '/settings/restaurant-ordering' },
          ],
        },
      ],
    },
  ],
}
