import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { OperationsSettings } from '@/features/menu-builder/components/OperationsSettings'
import { NotificationSettings } from '@/features/settings/notification-settings'
import { RestaurantSettingsForm } from '@/features/settings/restaurant-settings-form'

function RestaurantSettingsPage() {
  const restaurantId = useAuthStore((state) => state.restaurant?.id ?? null)
  return (
    <div className='w-full space-y-6 overflow-y-auto pe-1'>
      <RestaurantSettingsForm />
      <OperationsSettings restaurantId={restaurantId} />
      <NotificationSettings />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/settings/')({
  component: RestaurantSettingsPage,
})
