import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { AlertCircle, Send, MessageSquare, Loader2, Check, ExternalLink, Bell, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  restaurant_id: string
  admin_id: string | null
  sender_role: 'admin' | 'restaurant'
  sender_id: string
  sender_email: string
  sender_name: string | null
  title: string
  message: string
  type: 'subscription_warning' | 'urgent' | 'info' | 'chat'
  contact_url: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

interface Restaurant {
  id: string
  slug: string
  name: string
  name_ar: string | null
  owner_email: string | null
  is_active: boolean
  subscription_ends_at: string | null
  created_at: string
}

const TYPE_CONFIG = {
  subscription_warning: { label: 'تنبيه اشتراك', icon: Bell, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  urgent: { label: 'عاجل', icon: AlertCircle, color: 'bg-rose-100 text-rose-800 border-rose-200' },
  info: { label: 'معلومة', icon: MessageSquare, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  chat: { label: 'تواصل', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
} as const

export function ChatPage() {
  const { restaurantId } = useParams({ from: '/_authenticated/super-admin/chat/$restaurantId' })
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [liveTypingText, setLiveTypingText] = useState('')
  const [showLiveTyping, setShowLiveTyping] = useState(false)
  const liveTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const adminDisplayName = useRef<string>('')

  // Fetch admin display name
  useEffect(() => {
    const fetchAdminName = async () => {
      if (!user) return
      const { data } = await supabase.rpc('get_current_admin_display_name')
      adminDisplayName.current = data || user.user_metadata?.full_name || user.email?.split('@')[0] || 'الإدارة'
    }
    fetchAdminName()
  }, [user])

  // Initialize broadcast channel for live typing preview (listen to restaurant typing)
  useEffect(() => {
    if (!restaurantId) return

    const channel = supabase.channel(`support-live:${restaurantId}`, {
      config: {
        broadcast: { self: false, ack: false },
      },
    })

    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const text = payload.payload?.text as string
      setLiveTypingText(text)
      setShowLiveTyping(text.length > 0)

      // Auto-hide after 4 seconds of inactivity
      if (liveTypingTimeoutRef.current) {
        clearTimeout(liveTypingTimeoutRef.current)
      }
      if (text.length > 0) {
        liveTypingTimeoutRef.current = setTimeout(() => {
          setShowLiveTyping(false)
          setLiveTypingText('')
        }, 4000)
      }
    })

    channel.subscribe()
    broadcastChannelRef.current = channel

    return () => {
      if (liveTypingTimeoutRef.current) {
        clearTimeout(liveTypingTimeoutRef.current)
      }
      supabase.removeChannel(channel)
      broadcastChannelRef.current = null
    }
  }, [restaurantId])

  const fetchRestaurant = useCallback(async () => {
    if (!restaurantId) return
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, slug, name, name_ar, owner_email, is_active, subscription_ends_at, created_at')
      .eq('id', restaurantId)
      .maybeSingle()
    if (error) {
      toast.error('تعذر تحميل بيانات المطعم')
      return
    }
    if (data) setRestaurant(data)
  }, [restaurantId])

  const fetchMessages = useCallback(async () => {
    if (!restaurantId) return

    const { data, error } = await supabase
      .from('platform_notifications')
      .select('id, restaurant_id, admin_id, title, message, type, contact_url, is_read, read_at, created_at, sender_role, sender_id, sender_email, sender_name')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('تعذر تحميل الرسائل')
      return
    }

    const formattedMessages = (data ?? []).map((msg) => ({
      ...msg,
      sender_role: msg.sender_role ?? (msg.admin_id ? 'admin' as const : 'restaurant' as const),
      sender_id: msg.sender_id ?? msg.admin_id ?? '',
      sender_email: msg.sender_email ?? (msg.admin_id ? 'الإدارة' : 'المطعم'),
      sender_name: msg.sender_name ?? null,
    })) as ChatMessage[]

    setMessages(formattedMessages)
    setIsLoading(false)
  }, [restaurantId])

  // Realtime subscription for new messages
  useEffect(() => {
    if (!restaurantId) return

    const channel = supabase
      .channel(`admin-chat-messages:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_notifications',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, {
              ...newMsg,
              sender_role: newMsg.sender_role ?? (newMsg.admin_id ? 'admin' as const : 'restaurant' as const),
              sender_id: newMsg.sender_id ?? newMsg.admin_id ?? '',
              sender_email: newMsg.sender_email ?? (newMsg.admin_id ? 'الإدارة' : 'المطعم'),
              sender_name: newMsg.sender_name ?? null,
            }]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurantId])

  useEffect(() => {
    fetchRestaurant()
    fetchMessages()
  }, [fetchRestaurant, fetchMessages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !restaurantId || !user) return

    setIsSending(true)
    try {
      const senderName = adminDisplayName.current || 'الإدارة'
      const { error } = await supabase.from('platform_notifications').insert({
        restaurant_id: restaurantId,
        admin_id: user.id,
        title: 'رد من فريق الدعم الفني',
        message: newMessage.trim(),
        type: 'chat',
        contact_url: null,
        is_read: false,
        sender_role: 'admin',
        sender_id: user.id,
        sender_email: user.email,
        sender_name: senderName,
      })

      if (error) throw error

      toast.success('تم إرسال الرد بنجاح')
      setNewMessage('')
      // Broadcast empty to clear any live preview
      broadcastChannelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { text: '' },
      })
    } catch (error) {
      toast.error('تعذر إرسال الرد')
    } finally {
      setIsSending(false)
    }
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
  }

  const handleOpenContactUrl = (url: string) => {
    window.open(url, '_blank')
  }

  const handleMarkAsRead = async (messageId: string) => {
    await supabase
      .from('platform_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId)
  }

  if (!restaurant) {
    return (
      <div className='flex min-h-[60vh] items-center justify-center'>
        <Card className='w-full max-w-md'>
          <CardContent className='pt-6'>
            <div className='text-center'>
              <AlertCircle className='mx-auto size-12 text-rose-500 mb-4' />
              <h2 className='text-xl font-semibold'>جاري التحميل...</h2>
              <p className='text-muted-foreground mt-2'>يتم تحميل بيانات المطعم والمحادثة</p>
              <Loader2 className='mx-auto size-8 animate-spin text-primary mt-4' />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/super-admin' })} className='text-muted-foreground hover:text-foreground'>
            <X className='size-5' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{restaurant.name}</h1>
            <p className='text-muted-foreground text-sm'>
              /menu/{restaurant.slug} | {restaurant.owner_email}
            </p>
          </div>
        </div>
        <Badge variant={restaurant.is_active ? 'default' : 'secondary'} className='text-sm'>
          {restaurant.is_active ? 'نشط' : 'متوقف'}
        </Badge>
      </div>

      {/* Live Typing Preview */}
      {showLiveTyping && liveTypingText && (
        <Card className='border-blue-200 bg-blue-50 animate-fade-in'>
          <CardContent className='pt-4 pb-2'>
            <div className='flex items-center gap-2 text-blue-800'>
              <MessageSquare className='size-4' />
              <span className='font-medium text-sm'>ما يكتبه العميل حالياً (مسودة حية):</span>
            </div>
            <div className='mt-2 p-3 bg-white rounded-lg border border-blue-100 font-mono text-sm text-blue-900 whitespace-pre-wrap max-h-24 overflow-auto'>
              {liveTypingText}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <MessageSquare className='size-5' />
            المحادثة الكاملة (مؤرشفة)
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
                <p className='text-lg font-medium'>لا توجد رسائل بعد</p>
                <p className='text-sm'>ابدأ المحادثة بإرسال أول رسالة</p>
              </div>
            ) : (
              messages.map((msg) => {
                const config = TYPE_CONFIG[msg.type]
                const Icon = config.icon
                const isFromRestaurant = msg.sender_role === 'restaurant'
                const isOwn = msg.sender_role === 'admin' && msg.sender_id === user?.id
                const senderDisplayName = isFromRestaurant
                  ? (msg.sender_name ?? msg.sender_email ?? 'المطعم')
                  : (isOwn ? 'أنت' : (msg.sender_name ?? msg.sender_email ?? 'الإدارة'))

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3 transition-colors',
                      isFromRestaurant ? 'flex-row' : 'flex-row-reverse'
                    )}
                  >
                    <div
                      className={cn(
                        'flex-shrink-0 size-10 rounded-full flex items-center justify-center',
                        isFromRestaurant ? config.color : (isOwn ? 'bg-primary text-primary-foreground' : 'bg-emerald-100 text-emerald-800')
                      )}
                    >
                      {isFromRestaurant ? (
                        <Icon className='size-5' />
                      ) : (
                        <User className='size-5' />
                      )}
                    </div>
                    <div
                      className={cn(
                        'flex-1 max-w-[75%] p-4 rounded-2xl',
                        isFromRestaurant
                          ? 'bg-muted rounded-br-md'
                          : (isOwn ? 'bg-primary text-primary-foreground rounded-bl-md' : 'bg-emerald-50 text-emerald-900 rounded-bl-md')
                      )}
                    >
                      <div className='flex items-center justify-between gap-2 mb-2'>
                        <span className='font-medium text-sm'>{senderDisplayName}</span>
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
                        <div className='flex items-center gap-2'>
                          {msg.contact_url && (
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
                          {!msg.is_read && isFromRestaurant && (
                            <Button
                              variant='outline'
                              size='sm'
                              className='gap-1 text-xs'
                              onClick={() => handleMarkAsRead(msg.id)}
                            >
                              <Check className='size-3' />
                              تعليم كمقروء
                            </Button>
                          )}
                          {msg.is_read && isFromRestaurant && (
                            <Badge variant='secondary' className='text-xs gap-1'>
                              <Check className='size-3' />
                              مقروء
                            </Badge>
                          )}
                        </div>
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
              <label htmlFor='admin-chat-message' className='sr-only'>
                ردك للعميل
              </label>
              <Textarea
                id='admin-chat-message'
                placeholder='اكتب ردك هنا... سيظهر للعميل فوراً مع اسمك.'
                value={newMessage}
                onChange={handleMessageChange}
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
                  إرسال الرد
                </>
              )}
            </Button>
            <p className='text-xs text-muted-foreground text-center'>
              سيظهر ردك للعميل باسم: <strong>{adminDisplayName.current || 'جاري التحميل...'}</strong>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}