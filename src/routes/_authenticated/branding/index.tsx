import { createFileRoute } from '@tanstack/react-router'
import { BrandingManagement } from '@/features/branding'

export const Route = createFileRoute('/_authenticated/branding/')({
  component: BrandingManagement,
})
