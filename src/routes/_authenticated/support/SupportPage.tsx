import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { AlertCircle, Send, MessageSquare, Loader2, Check, ExternalLink, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SupportMessage {
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

const TYPE_CONFIG = {
  subscription_warning: { label: 'تنبيه اشتراك', icon: Bell, color: 'bg-amber-950/40 border-amber-500/40 text-amber-200' },
  urgent: { label: 'عاجل', icon: AlertCircle, color: 'bg-rose-950/40 border-rose-500/40 text-rose-200' },
  info: { label: 'معلومة', icon: MessageSquare, color: 'bg-blue-950/40 border-blue-500/40 text-blue-200' },
  chat: { label: 'تواصل', icon: MessageSquare, color: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' },
} as const

function throttle(fn: (text: string) => void, delay: number): (text: string) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: string | null = null

  return ((text: string) => {
    lastArgs = text
    if (timeoutId === null) {
      fn(text)
      timeoutId = setTimeout(() => {
        timeoutId = null
        if (lastArgs !== null) {
          fn(lastArgs)
          lastArgs = null
        }
      }, delay)
    }
  })
}

export function SupportPage() {
  const navigate = useNavigate()
  const { user, restaurant, markNotificationRead, loadNotifications } = useAuthStore()
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [showAlert, setShowAlert] = useState(true)
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Initialize broadcast channel for live typing preview
  useEffect(() => {
    if (!restaurant?.id) return

    const channel = supabase.channel(`support-live:${restaurant.id}`, {
      config: {
        broadcast: { self: false, ack: false },
      },
    })

    channel.subscribe()
    broadcastChannelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      broadcastChannelRef.current = null
    }
  }, [restaurant?.id])

  // Throttled broadcast function
  const broadcastTyping = useRef(
    throttle((text: string) => {
      broadcastChannelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { text },
      })
    }, 150)
  ).current

  const fetchMessages = useCallback(async () => {
    if (!restaurant?.id) return

    const now = Date.now()
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

    const { data, error } = await supabase
      .from('platform_notifications')
      .select('id, restaurant_id, admin_id, title, message, type, contact_url, is_read, read_at, created_at, sender_role, sender_id, sender_email, sender_name')
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', new Date(twentyFourHoursAgo).toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('تعذر تحميل الرسائل')
      return
    }

    const formattedMessages = (data ?? []).map((msg) => ({
      ...msg,
      sender_role: msg.sender_role ?? (msg.admin_id ? 'admin' as const : 'restaurant' as const),
      sender_id: msg.sender_id ?? msg.admin_id ?? user?.id ?? '',
      sender_email: msg.sender_email ?? (msg.admin_id ? 'الإدارة' : user?.email ?? ''),
      sender_name: msg.sender_name ?? null,
    })) as SupportMessage[]

    setMessages(formattedMessages)
    setIsLoading(false)
  }, [restaurant?.id, user?.id, user?.email])

  // Realtime subscription for new messages
  useEffect(() => {
    if (!restaurant?.id) return

    const channel = supabase
      .channel(`support-messages:${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_notifications',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          const newMsg = payload.new as SupportMessage
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, {
              ...newMsg,
              sender_role: newMsg.sender_role ?? (newMsg.admin_id ? 'admin' as const : 'restaurant' as const),
              sender_id: newMsg.sender_id ?? newMsg.admin_id ?? user?.id ?? '',
              sender_email: newMsg.sender_email ?? (newMsg.admin_id ? 'الإدارة' : user?.email ?? ''),
              sender_name: newMsg.sender_name ?? null,
            }]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
        sender_name: 'المطعم',
      })

      if (error) throw error

      toast.success('تم إرسال الرسالة بنجاح')
      setNewMessage('')
      broadcastTyping('')
      await fetchMessages()
      await loadNotifications()
    } catch (error) {
      toast.error('تعذر إرسال الرسالة')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as unknown as React.FormEvent)
    }
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewMessage(value)
    broadcastTyping(value)
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
    <div className='h-[calc(100vh-8rem)] flex flex-col'>
      {/* Header */}
      <div className='shrink-0 px-4 py-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-xl font-bold tracking-tight'>التواصل والدعم الفني</h1>
            <p className='text-slate-400 text-sm mt-0.5'>
              تواصل مع إدارة المنصة، استعرض التنبيهات، وأرسل استفساراتك للدعم الفني.
            </p>
          </div>
        </div>
      </div>

      {/* 24-hour Alert Bar */}
      {showAlert && (
        <div className='shrink-0 px-4 py-2 border-b border-slate-800'>
          <div className='flex items-center gap-3 bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs py-2 px-3 rounded-lg'>
            <AlertCircle className='size-4 shrink-0' />
            <span className='flex-1'>
              تنبيه: تُحذف الرسائل تلقائياً من لوحة المطعم بعد مرور 24 ساعة لأغراض الخصوصية والتنظيم، بينما تبقى مؤرشفة لدى إدارة المنصة.
            </span>
            <Button
              variant='ghost'
              size='sm'
              className='text-amber-300 hover:bg-amber-500/10 px-2 py-1'
              onClick={() => setShowAlert(false)}
            >
              إخفاء
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className='flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-950' ref={scrollAreaRef}>
        {isLoading ? (
          <div className='flex items-center justify-center h-full'>
            <Loader2 className='size-8 animate-spin text-primary' />
          </div>
        ) : messages.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-slate-500'>
            <MessageSquare className='size-12 mb-3 opacity-50' />
            <p className='text-lg font-medium'>لا توجد رسائل خلال الـ 24 ساعة الماضية</p>
            <p className='text-sm'>ستظهر هنا رسائل الإدارة وردودك عند توفرها</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const config = TYPE_CONFIG[msg.type]
              const isOwn = msg.sender_role === 'restaurant'
              const isSystemMessage = msg.type === 'subscription_warning' || msg.type === 'urgent'
              const senderDisplayName = isOwn ? 'أنت' : (msg.sender_name ?? msg.sender_email ?? 'الإدارة')

              // System messages (subscription_warning, urgent) - centered card
              if (isSystemMessage) {
                return (
                  <div key={msg.id} className='flex justify-center'>
                    <div className={`${config.color} w-fit max-w-[85%] rounded-2xl px-5 py-4 shadow-sm border`}>
                      <div className='flex items-start gap-3'>
                        <config.icon className='size-5 shrink-0 mt-0.5' />
                        <div className='flex-1 min-w-0'>
                          <h4 className='font-medium text-sm'>{msg.title}</h4>
                          <p className='mt-1 text-sm opacity-90 whitespace-pre-wrap'>{msg.message}</p>
                          <div className='mt-3 flex items-center justify-between'>
                            <span className='text-xs opacity-70'>
                              {new Date(msg.created_at).toLocaleString('ar-SA', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                            {msg.contact_url && (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='gap-1 text-xs opacity-80 hover:opacity-100'
                                onClick={() => handleOpenContactUrl(msg.contact_url!)}
                              >
                                <ExternalLink className='size-3' />
                                فتح قناة التواصل
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              // Regular chat messages
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2.5 transition-colors animate-fade-in',
                    isOwn ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div
                    className={cn(
                      'w-fit max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
                      isOwn
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-sm'
                    )}
                  >
                    {!isOwn && (
                      <div className='text-xs font-medium text-slate-400 mb-1 px-1'>
                        {senderDisplayName}
                      </div>
                    )}
                    <p className='text-sm whitespace-pre-wrap'>{msg.message}</p>
                    <div className='flex items-center justify-end gap-2 mt-1.5'>
                      <span className={cn('text-xs opacity-60', isOwn ? 'text-blue-100' : 'text-slate-500')}>
                        {new Date(msg.created_at).toLocaleString('ar-SA', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {msg.contact_url && !isOwn && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className={cn('gap-1 text-xs', isOwn ? 'text-blue-100 hover:bg-white/10' : 'text-slate-400 hover:bg-white/5')}
                          onClick={() => handleOpenContactUrl(msg.contact_url!)}
                        >
                          <ExternalLink className='size-3' />
                          فتح قناة التواصل
                        </Button>
                      )}
                      {msg.is_read && isOwn && (
                        <Badge variant='secondary' className='text-xs gap-1'>
                          <Check className='size-3' />
                          مقروء
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className='shrink-0 border-t border-slate-800 bg-slate-950/90 backdrop-blur-sm p-3'>
        <form onSubmit={handleSendMessage} className='space-y-2'>
          <div className='relative'>
            <Textarea
              id='support-message'
              placeholder='اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)'
              value={newMessage}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              rows={1}
              className='resize-none bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-primary/20 min-h-[48px] max-h-[120px] pr-12'
            />
            <Button
              type='submit'
              disabled={!newMessage.trim() || isSending}
              className='absolute bottom-2 left-2 h-8 w-8 p-0'
              aria-label='إرسال الرسالة'
            >
              {isSending ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Send className='size-4' />
              )}
            </Button>
          </div>
          <p className='text-xs text-slate-500 text-center'>
            سيتم إنشاء تذكرة دعم فني جديدة وسيتم الرد عليك في أقرب وقت ممكن.
          </p>
        </form>
      </div>
    </div>
  )
}