import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '@/features/coming-soon'

export const Route = createFileRoute('/_authenticated/analytics/')({
  component: () => (
    <ComingSoonPage
      title='التحليلات'
      description='إحصائيات المبيعات والأصناف الأكثر طلباً قريباً.'
    />
  ),
})
