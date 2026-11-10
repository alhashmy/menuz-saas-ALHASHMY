import { createFileRoute } from '@tanstack/react-router'
import { TablesManagement } from '@/features/tables'

export const Route = createFileRoute('/_authenticated/qr-codes/')({
  component: TablesManagement,
})
