import { createFileRoute } from '@tanstack/react-router'
import { StaffManagementPage } from '@/features/staff'

export const Route = createFileRoute('/_authenticated/staff/')({
  component: StaffManagementPage,
})
