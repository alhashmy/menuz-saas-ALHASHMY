import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '@/features/coming-soon'

export const Route = createFileRoute('/_authenticated/orders/')({
  component: () => (
    <ComingSoonPage
      title='الطلبات'
      description='لوحة متابعة طلبات الزبائن لحظة بلحظة قيد التطوير حالياً.'
    />
  ),
})
