import { createFileRoute } from '@tanstack/react-router'
import { DeliveryManagementPage } from '@/features/super-admin/components/DeliveryManagementPage'

export const Route = createFileRoute('/_authenticated/super-admin/delivery/')({
  component: DeliveryManagementPage,
})
