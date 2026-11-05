import { createFileRoute } from '@tanstack/react-router'
import { PublicMenu } from '@/features/public-menu'

export const Route = createFileRoute('/menu/$restaurantSlug')({
  component: RouteComponent,
})

function RouteComponent() {
  const { restaurantSlug } = Route.useParams()
  return <PublicMenu restaurantSlug={restaurantSlug} />
}
