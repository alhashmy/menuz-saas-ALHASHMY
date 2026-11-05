import { createFileRoute } from '@tanstack/react-router'
import { OffersManagement } from '@/features/offers'

export const Route = createFileRoute('/_authenticated/offers/')({
  component: OffersManagement,
})
