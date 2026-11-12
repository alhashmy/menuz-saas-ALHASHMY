import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { OperationsSettings } from '@/features/menu-builder/components/OperationsSettings'
import { NotificationSettings } from '@/features/settings/notification-settings'
import { RestaurantSettingsForm } from '@/features/settings/restaurant-settings-form'
import { PasswordChangeCard } from '@/features/settings/password-change-card'
import { Card, CardContent } from '@/components/ui/card'

function RestaurantSettingsPage() {
  const restaurant = useAuthStore((state) => state.restaurant)
  const restaurantId = restaurant?.id ?? null

  // Kill switch: Check if restaurant is inactive or subscription expired
  const isInactive = restaurant?.is_active === false
  const isSubscriptionExpired = restaurant?.subscription_ends_at && new Date(restaurant.subscription_ends_at) < new Date()

  if (isInactive || isSubscriptionExpired) {
    return (
      <div className='w-full space-y-6 overflow-y-auto pe-1'>
        <Card className='border-rose-200 bg-rose-50'>
          <CardContent className='pt-6'>
            <div className='flex flex-col items-center text-center gap-4'>
              <AlertCircle className='size-12 text-rose-500' />
              <h2 className='text-2xl font-bold text-rose-600'>الحساب موقوف</h2>
              <p className='text-lg text-rose-700 max-w-xl'>
                عذراً، تم إيقاف هذا الحساب مؤقتاً.
                {isSubscriptionExpired && (
                  <> انتهى الاشتراك في {new Date(restaurant!.subscription_ends_at!).toLocaleDateString('ar-SA')}. </>
                )}
                يرجى تواصل إدارة المطعم مع مزود الخدمة لتجديد الاشتراك وتفعيل الحساب.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='w-full space-y-6 overflow-y-auto pe-1'>
      <RestaurantSettingsForm />
      <OperationsSettings restaurantId={restaurantId} />
      <NotificationSettings />
      <PasswordChangeCard />
    </div>
  )
}

export const Route = createFileRoute('/_authenticated/settings/')({
  component: RestaurantSettingsPage,
})
