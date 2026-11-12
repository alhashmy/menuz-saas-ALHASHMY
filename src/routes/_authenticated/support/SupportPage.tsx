import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { AlertCircle, Send, MessageSquare, Loader2, Check, ExternalLink, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface SupportMessage {
  id: string
  restaurant_id: string
  admin_id: string | null
  sender_role: 'admin' | 'restaurant'
  sender_id: string
  sender_email: string
  title: string
  message: string
  type: 'subscription_warning' | 'urgent' | 'info' | 'chat'
  contact_url: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

const TYPE_CONFIG = {
  subscription_warning: { label: 'تنبيه اشتراك', icon: Bell, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  urgent: { label: 'عاجل', icon: AlertCircle, color: 'bg-rose-100 text-rose-800 border-rose-200' },
  info: { label: 'معلومة', icon: MessageSquare, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  chat: { label: 'تواصل', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
} as const

export function SupportPage() {
  const navigate = useNavigate()
  const { user, restaurant, markNotificationRead, loadNotifications } = useAuthStore()
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [showAlert, setShowAlert] = useState(true)

  const fetchMessages = useCallback(async () => {
    if (!restaurant?.id) return

    const now = Date.now()
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

    const { data, error } = await supabase
      .from('platform_notifications')
      .select('id, restaurant_id, admin_id, title, message, type, contact_url, is_read, read_at, created_at')
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', new Date(twentyFourHoursAgo).toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('تعذر تحميل الرسائل')
      return
    }

    const formattedMessages = (data ?? []).map((msg) => ({
      ...msg,
      sender_role: msg.admin_id ? 'admin' as const : 'restaurant' as const,
      sender_id: msg.admin_id || user?.id || '',
      sender_email: msg.admin_id ? 'الإدارة' : user?.email || '',
    })) as SupportMessage[]

    setMessages(formattedMessages)
    setIsLoading(false)
  }, [restaurant?.id, user?.id, user?.email])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    const unreadAdminMessages = messages.filter(
      (m) => m.sender_role === 'admin' && !m.is_read
    )
    if (unreadAdminMessages.length > 0) {
      unreadAdminMessages.forEach((msg) => markNotificationRead(msg.id))
    }
  }, [messages, markNotificationRead])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !restaurant?.id || !user) return

    setIsSending(true)
    try {
      const { error } = await supabase.from('platform_notifications').insert({
        restaurant_id: restaurant.id,
        admin_id: null,
        title: 'رسالة دعم فني من المطعم',
        message: newMessage.trim(),
        type: 'chat',
        contact_url: null,
        is_read: false,
        sender_role: 'restaurant',
        sender_id: user.id,
        sender_email: user.email,
      })

      if (error) throw error

      toast.success('تم إرسال الرسالة بنجاح')
      setNewMessage('')
      await fetchMessages()
      await loadNotifications()
    } catch (error) {
      toast.error('تعذر إرسال الرسالة')
    } finally {
      setIsSending(false)
    }
  }

  const handleOpenContactUrl = (url: string) => {
    window.open(url, '_blank')
  }

  if (!restaurant) {
    return (
      <div className='flex min-h-[60vh] items-center justify-center'>
        <Card className='w-full max-w-md'>
          <CardContent className='pt-6'>
            <div className='text-center'>
              <AlertCircle className='mx-auto size-12 text-rose-500 mb-4' />
              <h2 className='text-xl font-semibold'>غير مصرح</h2>
              <p className='text-muted-foreground mt-2'>
                يجب أن تكون مالك مطعم للوصول إلى صفحة التواصل والدعم الفني.
              </p>
              <Button className='mt-4' onClick={() => navigate({ to: '/dashboard' })}>
                العودة للوحة التحكم
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>التواصل والدعم الفني</h1>
        <p className='text-muted-foreground mt-1'>
          تواصل مع إدارة المنصة، استعرض التنبيهات، وأرسل استفساراتك للدعم الفني.
        </p>
      </div>

      {showAlert && (
        <Card className='border-amber-200 bg-amber-50'>
          <CardContent className='pt-6'>
            <div className='flex items-start gap-3'>
              <AlertCircle className='size-5 text-amber-600 mt-0.5 shrink-0' />
              <div className='flex-1'>
                <p className='font-medium text-amber-900'>
                  تنبيه: تُحذف الرسائل تلقائياً من لوحة المطعم بعد مرور 24 ساعة لأغراض الخصوصية والتنظيم، بينما تبقى مؤرشفة لدى إدارة المنصة.
                </p>
                <Button
                  variant='ghost'
                  size='sm'
                  className='mt-2 text-amber-700 hover:bg-amber-100'
                  onClick={() => setShowAlert(false)}
                >
                  فهمت، إخفاء التنبيه
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <MessageSquare className='size-5' />
            المحادثة
          </CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <ScrollArea className='max-h-[500px] space-y-4 pb-4'>
            {isLoading ? (
              <div className='flex items-center justify-center py-12'>
                <Loader2 className='size-8 animate-spin text-primary' />
              </div>
            ) : messages.length === 0 ? (
              <div className='text-center py-12 text-muted-foreground'>
                <MessageSquare className='mx-auto size-12 mb-3 text-muted-foreground/50' />
                <p className='text-lg font-medium'>لا توجد رسائل خلال الـ 24 ساعة الماضية</p>
                <p className='text-sm'>ستظهر هنا رسائل الإدارة وردودك عند توفرها</p>
              </div>
            ) : (
              messages.map((msg) => {
                const config = TYPE_CONFIG[msg.type]
                const Icon = config.icon
                const isOwn = msg.sender_role === 'restaurant'

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3 transition-colors',
                      isOwn ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    <div
                      className={cn(
                        'flex-shrink-0 size-10 rounded-full flex items-center justify-center',
                        isOwn ? 'bg-primary text-primary-foreground' : config.color
                      )}
                    >
                      <Icon className='size-5' />
                    </div>
                    <div
                      className={cn(
                        'flex-1 max-w-[70%] p-4 rounded-2xl',
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      )}
                    >
                      <div className='flex items-center justify-between gap-2 mb-2'>
                        <span className='font-medium text-sm'>
                          {isOwn ? 'أنت' : 'الإدارة'}
                        </span>
                        <Badge variant='outline' className={cn('text-xs', config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className='text-sm whitespace-pre-wrap'>{msg.message}</p>
                      <div className='flex items-center justify-between mt-2'>
                        <span className='text-xs opacity-60'>
                          {new Date(msg.created_at).toLocaleString('ar-SA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {msg.contact_url && !isOwn && (
                          <Button
                            variant='ghost'
                            size='sm'
                            className='gap-1 text-xs'
                            onClick={() => handleOpenContactUrl(msg.contact_url!)}
                          >
                            <ExternalLink className='size-3' />
                            فتح قناة التواصل
                          </Button>
                        )}
                        {msg.is_read && msg.sender_role === 'admin' && (
                          <Badge variant='secondary' className='text-xs gap-1'>
                            <Check className='size-3' />
                            مقروء
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </ScrollArea>

          <Separator className='my-4' />

          <form onSubmit={handleSendMessage} className='space-y-3'>
            <div>
              <label htmlFor='support-message' className='sr-only'>
                رسالتك للدعم الفني
              </label>
              <Textarea
                id='support-message'
                placeholder='اكتب رسالتك أو استفسارك هنا... سيتم إرساله مباشرة إلى فريق الدعم الفني.'
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
                className='resize-none'
              />
            </div>
            <Button
              type='submit'
              disabled={!newMessage.trim() || isSending}
              className='w-full justify-end gap-2'
            >
              {isSending ? (
                <>
                  <Loader2 className='size-4 animate-spin' />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className='size-4' />
                  إرسال رسالة للدعم الفني
                </>
              )}
            </Button>
            <p className='text-xs text-muted-foreground text-center'>
              سيتم إنشاء تذكرة دعم فني جديدة وسيتم الرد عليك في أقرب وقت ممكن.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}