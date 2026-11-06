import { createFileRoute } from '@tanstack/react-router'
import { SettingsRestaurantOrdering } from '@/features/settings/restaurant-ordering'

export const Route = createFileRoute('/_authenticated/settings/restaurant-ordering')({
  component: SettingsRestaurantOrdering,
})
