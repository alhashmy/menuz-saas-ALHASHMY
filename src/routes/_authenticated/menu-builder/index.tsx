import { createFileRoute } from '@tanstack/react-router'
import { MenuBuilder } from '@/features/menu-builder'

export const Route = createFileRoute('/_authenticated/menu-builder/')({
  component: MenuBuilder,
})
