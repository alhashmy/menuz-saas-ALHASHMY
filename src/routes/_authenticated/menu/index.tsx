import { createFileRoute } from '@tanstack/react-router'
import { MenuManagement } from '@/features/menu'

export const Route = createFileRoute('/_authenticated/menu/')({
  component: MenuManagement,
})
