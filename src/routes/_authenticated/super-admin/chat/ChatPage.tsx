import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { AlertCircle, Send, MessageSquare, Loader2, Check, ExternalLink, Bell, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  subscription_warning: { label: 'تنبيه اشتراك', icon: Bell, color: 'bg-amber-950/40 border-amber-500/40 text-amber-200' },
  urgent: { label: 'عاجل', icon: AlertCircle, color: 'bg-rose-950/40 border-rose-500/40 text-rose-200' },
  info: { label: 'معلومة', icon: MessageSquare, color: 'bg-blue-950/40 border-blue-500/40 text-blue-200' },
  chat: { label: 'تواصل', icon: MessageSquare, color: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' },
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as unknown as React.FormEvent)
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
      <div className='h-[calc(100vh-8rem)] flex flex-col'>
        <div className='shrink-0 px-4 py-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm'>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/super-admin' })} className='text-muted-foreground hover:text-foreground'>
              <ArrowLeft className='size-5' />
            </Button>
            <div>
              <h1 className='text-xl font-bold'>جاري التحميل...</h1>
              <p className='text-slate-400 text-sm'>يتم تحميل بيانات المطعم والمحادثة</p>
            </div>
          </div>
        </div>
        <div className='flex-1 flex items-center justify-center'>
          <Loader2 className='size-8 animate-spin text-primary' />
        </div>
      </div>
    )
  }

  return (
    <div className='h-[calc(100vh-8rem)] flex flex-col'>
      {/* Header */}
      <div className='shrink-0 px-4 py-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='icon' onClick={() => navigate({ to: '/super-admin' })} className='text-muted-foreground hover:text-foreground'>
              <ArrowLeft className='size-5' />
            </Button>
            <div>
              <h1 className='text-xl font-bold tracking-tight'>{restaurant.name}</h1>
              <p className='text-slate-400 text-sm mt-0.5'>
                /menu/{restaurant.slug} | {restaurant.owner_email}
              </p>
            </div>
          </div>
          <Badge variant={restaurant.is_active ? 'default' : 'secondary'} className='text-sm'>
            {restaurant.is_active ? 'نشط' : 'متوقف'}
          </Badge>
        </div>
      </div>

      {/* Live Typing Preview */}
      {showLiveTyping && liveTypingText && (
        <div className='shrink-0 px-4 py-2 border-b border-slate-800'>
          <Card className='bg-blue-950/30 border-blue-500/30 text-blue-200'>
            <CardContent className='py-3'>
              <div className='flex items-center gap-2'>
                <MessageSquare className='size-4' />
                <span className='font-medium text-sm'>ما يكتبه العميل حالياً (مسودة حية):</span>
              </div>
              <div className='mt-2 p-3 bg-slate-900/50 rounded-lg border border-blue-500/20 font-mono text-sm text-blue-100 whitespace-pre-wrap max-h-24 overflow-auto'>
                {liveTypingText}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Messages Area */}
      <div className='flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-950'>
        {isLoading ? (
          <div className='flex items-center justify-center h-full'>
            <Loader2 className='size-8 animate-spin text-primary' />
          </div>
        ) : messages.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-slate-500'>
            <MessageSquare className='size-12 mb-3 opacity-50' />
            <p className='text-lg font-medium'>لا توجد رسائل بعد</p>
            <p className='text-sm'>ابدأ المحادثة بإرسال أول رسالة</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const config = TYPE_CONFIG[msg.type]
              const isFromRestaurant = msg.sender_role === 'restaurant'
              const isOwn = msg.sender_role === 'admin' && msg.sender_id === user?.id
              const isSystemMessage = msg.type === 'subscription_warning' || msg.type === 'urgent'
              const senderDisplayName = isFromRestaurant
                ? (msg.sender_name ?? msg.sender_email ?? 'المطعم')
                : (isOwn ? 'أنت' : (msg.sender_name ?? msg.sender_email ?? 'الإدارة'))

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
                    isFromRestaurant ? 'flex-row' : 'flex-row-reverse'
                  )}
                >
                  <div
                    className={cn(
                      'w-fit max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
                      isFromRestaurant
                        ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-sm'
                        : (isOwn ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-emerald-950/40 text-emerald-100 border border-emerald-500/30 rounded-br-sm')
                    )}
                  >
                    {isFromRestaurant && (
                      <div className='text-xs font-medium text-slate-400 mb-1 px-1'>
                        {senderDisplayName}
                      </div>
                    )}
                    <p className='text-sm whitespace-pre-wrap'>{msg.message}</p>
                    <div className='flex items-center justify-end gap-2 mt-1.5'>
                      <span className={cn('text-xs opacity-60', isFromRestaurant ? 'text-slate-500' : (isOwn ? 'text-blue-100' : 'text-emerald-300'))}>
                        {new Date(msg.created_at).toLocaleString('ar-SA', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {msg.contact_url && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className={cn('gap-1 text-xs', isFromRestaurant ? 'text-slate-400 hover:bg-white/5' : (isOwn ? 'text-blue-100 hover:bg-white/10' : 'text-emerald-300 hover:bg-white/5'))}
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
              id='admin-chat-message'
              placeholder='اكتب ردك... (Enter للإرسال، Shift+Enter لسطر جديد)'
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
              aria-label='إرسال الرد'
            >
              {isSending ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Send className='size-4' />
              )}
            </Button>
          </div>
          <p className='text-xs text-slate-500 text-center'>
            سيظهر ردك للعميل باسم: <strong>{adminDisplayName.current || 'جاري التحميل...'}</strong>
          </p>
        </form>
      </div>
    </div>
  )
}