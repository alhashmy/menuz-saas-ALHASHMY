import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '@/features/coming-soon'

export const Route = createFileRoute('/_authenticated/staff/')({
  component: () => (
    <ComingSoonPage
      title='الموظفون'
      description='دعوة الموظفين وإدارة الأدوار والصلاحيات قريباً.'
    />
  ),
})
