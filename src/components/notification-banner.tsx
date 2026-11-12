import { useState } from 'react'
import { Bell, CheckCircle, AlertCircle, Mail, MessageSquare, ExternalLink, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

const TYPE_CONFIG = {
  subscription_warning: { label: 'تنبيه اشتراك', icon: AlertCircle, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  urgent: { label: 'عاجل', icon: AlertCircle, color: 'bg-rose-100 text-rose-800 border-rose-200' },
  info: { label: 'معلومة', icon: Mail, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  chat: { label: 'تواصل', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
} as const

function NotificationCard({
  notification,
  onRead,
  isRead = false,
}: {
  notification: {
    id: string
    title: string
    message: string
    type: 'subscription_warning' | 'urgent' | 'info' | 'chat'
    contact_url: string | null
    is_read: boolean
    created_at: string
  }
  onRead: () => void
  isRead?: boolean
}) {
  const config = TYPE_CONFIG[notification.type]
  const Icon = config.icon

  return (
    <Card className={cn('border-l-4 transition-colors', isRead ? 'bg-muted/30' : '', config.color.replace('bg-', 'border-l-').replace('text-', '').replace('border-', ''))}>
      <CardContent className='p-3'>
        <div className='flex items-start gap-3'>
          <div className={cn('flex-shrink-0 size-8 rounded-full flex items-center justify-center', config.color)}>
            <Icon className='size-4' />
          </div>
          <div className='flex-1 min-w-0'>
            <div className='flex items-start justify-between gap-2'>
              <h4 className='font-medium text-sm'>{notification.title}</h4>
              <Badge variant='outline' className={cn('text-xs', config.color)}>
                {config.label}
              </Badge>
            </div>
            <p className='mt-1 text-sm text-muted-foreground line-clamp-2'>{notification.message}</p>
            <div className='flex items-center justify-between mt-2'>
              <span className='text-xs text-muted-foreground'>
                {new Date(notification.created_at).toLocaleString('ar-SA', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <div className='flex items-center gap-2'>
                {notification.contact_url && (
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-primary'
                    onClick={() => window.open(notification.contact_url!, '_blank')}
                    title='فتح قناة التواصل'
                  >
                    <ExternalLink className='size-4' />
                  </Button>
                )}
                {!notification.is_read && (
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-emerald-600'
                    onClick={onRead}
                    title='تعليم كمقروء'
                  >
                    <CheckCircle className='size-4' />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function NotificationBanner() {
  const { notifications, unreadCount, markNotificationRead } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)

  if (unreadCount === 0 && notifications.length === 0) return null

  const unreadNotifications = notifications.filter((n) => !n.is_read)

  return (
    <div className='fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50'>
      <div className={cn(
        'bg-white rounded-xl shadow-xl border overflow-hidden transition-all duration-300',
        isOpen ? 'max-h-[500px]' : 'max-h-20'
      )}>
        {/* Header */}
        <div className='flex items-center justify-between p-4 bg-gradient-to-r from-primary to-primary/80 text-white'>
          <div className='flex items-center gap-3'>
            <Bell className='size-5' />
            <div>
              <p className='font-semibold'>إشعارات من الإدارة</p>
              <p className='text-xs opacity-90'>
                {unreadCount > 0 ? `${unreadCount} إشعار جديد` : 'لا توجد إشعارات جديدة'}
              </p>
            </div>
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='text-white hover:bg-white/10'
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'إغلاق' : 'فتح'}
          >
            {isOpen ? <ChevronDown className='size-5' /> : <ChevronDown className='size-5 rotate-180' />}
          </Button>
        </div>

        {isOpen && (
          <div className='p-4 space-y-3 max-h-[400px] overflow-y-auto'>
            {unreadNotifications.length > 0 && (
              <>
                <p className='text-sm font-medium text-rose-600'>غير مقروء ({unreadCount})</p>
                {unreadNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onRead={() => markNotificationRead(notification.id)}
                  />
                ))}
              </>
            )}

            {notifications.filter((n) => n.is_read).length > 0 && (
              <>
                <Separator className='my-2' />
                <p className='text-sm font-medium text-muted-foreground'>مقروءة</p>
                {notifications.filter((n) => n.is_read).slice(0, 5).map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onRead={() => markNotificationRead(notification.id)}
                    isRead
                  />
                ))}
              </>
            )}

            {notifications.length > 5 && (
              <Button variant='outline' size='sm' className='w-full mt-2' onClick={() => setIsOpen(true)}>
                عرض جميع الإشعارات ({notifications.length})
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}