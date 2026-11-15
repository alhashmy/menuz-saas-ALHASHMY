import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { Search, Send, MessageSquare, Loader2, Check, ExternalLink, Bell, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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

interface RestaurantWithChat extends Restaurant {
  last_message?: string
  last_message_at?: string
  last_message_type?: string
  unread_count: number
  is_typing?: boolean
  typing_text?: string
}

interface ChatWorkspaceProps {
  initialRestaurantId?: string
  hideSidebar?: boolean
}

type NotificationType = 'subscription_warning' | 'urgent' | 'info' | 'chat'

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: typeof Bell; color: string }> = {
  subscription_warning: { label: 'تنبيه اشتراك', icon: Bell, color: 'bg-amber-950/40 border-amber-500/40 text-amber-200' },
  urgent: { label: 'عاجل', icon: AlertCircle, color: 'bg-rose-950/40 border-rose-500/40 text-rose-200' },
  info: { label: 'معلومة', icon: MessageSquare, color: 'bg-blue-950/40 border-blue-500/40 text-blue-200' },
  chat: { label: 'تواصل', icon: MessageSquare, color: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' },
} as const

function formatDateTime(dateString: string): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'الآن'
  if (diffMins < 60) return `منذ ${diffMins} د`
  if (diffHours < 24) return `منذ ${diffHours} س`
  if (diffDays < 7) return `منذ ${diffDays} ي`
  return formatDateTime(dateString)
}

export function ChatWorkspace({ initialRestaurantId, hideSidebar = false }: ChatWorkspaceProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [restaurants, setRestaurants] = useState<RestaurantWithChat[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(initialRestaurantId ?? null)
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSidebar, setShowSidebar] = useState(!hideSidebar)
  const [liveTypingText, setLiveTypingText] = useState('')
  const [showLiveTyping, setShowLiveTyping] = useState(false)
  const [adminDisplayName, setAdminDisplayName] = useState<string>('')
  
  const liveTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const typingChannelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map())

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const fetchRestaurantsWithChat = useCallback(async () => {
    try {
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('id, slug, name, name_ar, owner_email, is_active, subscription_ends_at, created_at')
        .order('created_at', { ascending: false })

      if (restaurantsError) throw restaurantsError
      if (!restaurantsData) return

      const restaurantIds = restaurantsData.map(r => r.id)
      
      const { data: messagesData, error: messagesError } = await supabase
        .from('platform_notifications')
        .select('id, restaurant_id, message, type, is_read, created_at, sender_role, sender_name')
        .in('restaurant_id', restaurantIds)
        .order('created_at', { ascending: false })

      if (messagesError) throw messagesError

      const messageMap = new Map<string, ChatMessage[]>()
      if (messagesData) {
        messagesData.forEach(msg => {
          const existing = messageMap.get(msg.restaurant_id) || []
          existing.push(msg as ChatMessage)
          messageMap.set(msg.restaurant_id, existing)
        })
      }

      const restaurantsWithStats: RestaurantWithChat[] = restaurantsData.map(restaurant => {
        const restaurantMessages = messageMap.get(restaurant.id) || []
        const lastMessage = restaurantMessages[0]
        const unreadCount = restaurantMessages.filter(m => 
          m.sender_role === 'restaurant' && !m.is_read
        ).length

        return {
          ...restaurant,
          last_message: lastMessage?.message?.slice(0, 60),
          last_message_at: lastMessage?.created_at,
          last_message_type: lastMessage?.type,
          unread_count: unreadCount,
        }
      })

      restaurantsWithStats.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1
        if (a.unread_count === 0 && b.unread_count > 0) return 1
        const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
        const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
        return timeB - timeA
      })

      setRestaurants(restaurantsWithStats)
      setIsLoadingRestaurants(false)
    } catch (error) {
      console.error('Error fetching restaurants:', error)
      setIsLoadingRestaurants(false)
    }
  }, [])

  useEffect(() => {
    fetchRestaurantsWithChat()
  }, [fetchRestaurantsWithChat])

  const fetchMessages = useCallback(async (restaurantId: string) => {
    if (!restaurantId) return

    setIsLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('platform_notifications')
        .select('id, restaurant_id, admin_id, title, message, type, contact_url, is_read, read_at, created_at, sender_role, sender_id, sender_email, sender_name')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const formattedMessages = (data ?? []).map((msg) => ({
        ...msg,
        sender_role: msg.sender_role ?? (msg.admin_id ? 'admin' as const : 'restaurant' as const),
        sender_id: msg.sender_id ?? msg.admin_id ?? '',
        sender_email: msg.sender_email ?? (msg.admin_id ? 'الإدارة' : 'المطعم'),
        sender_name: msg.sender_name ?? null,
      })) as ChatMessage[]

      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedRestaurantId) return

    fetchMessages(selectedRestaurantId)

    const channel = supabase
      .channel(`admin-chat-messages:${selectedRestaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'platform_notifications',
          filter: `restaurant_id=eq.${selectedRestaurantId}`,
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
  }, [selectedRestaurantId, fetchMessages])

  useEffect(() => {
    if (!selectedRestaurantId) return

    const unreadMessages = messages.filter(
      m => m.sender_role === 'restaurant' && !m.is_read
    )
    
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(msg => {
        supabase
          .from('platform_notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', msg.id)
      })

      setMessages(prev => prev.map(m => 
        m.sender_role === 'restaurant' && !m.is_read 
          ? { ...m, is_read: true, read_at: new Date().toISOString() }
          : m
      ))

      setRestaurants(prev => prev.map(r => 
        r.id === selectedRestaurantId ? { ...r, unread_count: 0 } : r
      ))
    }
  }, [selectedRestaurantId, messages])

  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = []

    restaurants.forEach(restaurant => {
      const channel = supabase.channel(`support-live:${restaurant.id}`, {
        config: { broadcast: { self: false, ack: false } },
      })

      channel.on('broadcast', { event: 'typing' }, (payload) => {
        const text = payload.payload?.text as string
        setRestaurants(prev => prev.map(r => 
          r.id === restaurant.id 
            ? { ...r, is_typing: text.length > 0, typing_text: text.length > 0 ? text : undefined }
            : r
        ))
      })

      channel.subscribe()
      channels.push(channel)
      typingChannelsRef.current.set(restaurant.id, channel)
    })

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
      typingChannelsRef.current.clear()
    }
  }, [restaurants])

  const handleRestaurantSelect = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId)
    setNewMessage('')
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedRestaurantId || !user) return

    setIsSending(true)
    try {
      const { error } = await supabase.from('platform_notifications').insert({
        restaurant_id: selectedRestaurantId,
        admin_id: user.id,
        title: 'رد من فريق الدعم الفني',
        message: newMessage.trim(),
        type: 'chat',
        contact_url: null,
        is_read: false,
        sender_role: 'admin',
        sender_id: user.id,
        sender_email: user.email,
        sender_name: adminDisplayName || 'الإدارة',
      })

      if (error) throw error

      setNewMessage('')
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

  const handleOpenContactUrl = (url: string) => {
    window.open(url, '_blank')
  }

  const handleMarkAsRead = async (messageId: string) => {
    await supabase
      .from('platform_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId)
    
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
    ))
  }

  const handleMessageChange = useRef(
    (() => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      let lastText = ''
      
      return (text: string) => {
        lastText = text
        if (timeoutId === null) {
          broadcastChannelRef.current?.send({
            type: 'broadcast',
            event: 'typing',
            payload: { text },
          })
          timeoutId = setTimeout(() => {
            timeoutId = null
            if (lastText !== text) {
              broadcastChannelRef.current?.send({
                type: 'broadcast',
                event: 'typing',
                payload: { text: lastText },
              })
            }
          }, 150)
        }
      }
    })()
  ).current

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewMessage(value)
    handleMessageChange(value)
  }

  useEffect(() => {
    const fetchAdminName = async () => {
      if (!user) return
      const { data } = await supabase.rpc('get_current_admin_display_name')
      setAdminDisplayName(data || user.user_metadata?.full_name || user.email?.split('@')[0] || 'الإدارة')
    }
    fetchAdminName()
  }, [user])

  useEffect(() => {
    if (!selectedRestaurantId) return

    const channel = supabase.channel(`support-live:${selectedRestaurantId}`, {
      config: { broadcast: { self: false, ack: false } },
    })

    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const text = payload.payload?.text as string
      setLiveTypingText(text)
      setShowLiveTyping(text.length > 0)

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
  }, [selectedRestaurantId])

  const filteredRestaurants = useMemo(() => {
    if (!searchQuery.trim()) return restaurants
    const query = searchQuery.toLowerCase()
    return restaurants.filter(r => 
      r.name.toLowerCase().includes(query) ||
      r.owner_email?.toLowerCase().includes(query) ||
      r.name_ar?.toLowerCase().includes(query)
    )
  }, [restaurants, searchQuery])

  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId)

  const openInNewPage = () => {
    if (selectedRestaurantId) {
      navigate({ to: `/super-admin/chat/${selectedRestaurantId}` })
    }
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  if (isLoadingRestaurants) {
    return (
      <div className='h-[calc(100vh-13rem)] flex items-center justify-center bg-slate-950'>
        <Loader2 className='size-12 animate-spin text-primary' />
      </div>
    )
  }

  const sidebarClasses = cn(
    'md:col-span-4 border-e border-slate-800 flex flex-col bg-slate-950/50 transition-all duration-300',
    isMobile && !showSidebar && 'fixed inset-y-0 left-0 z-40 w-72 shadow-xl',
    isMobile && showSidebar && 'fixed inset-y-0 left-0 z-40 w-72 shadow-xl'
  )

  const chatAreaClasses = cn(
    'flex flex-col bg-slate-900/40',
    !hideSidebar && 'md:col-span-8',
    isMobile && showSidebar && 'hidden'
  )

  const restaurantCardClasses = (restaurant: RestaurantWithChat, isSelected: boolean) => cn(
    'w-full justify-start gap-3 p-3 rounded-xl transition-all',
    isSelected 
      ? 'bg-primary/20 border-primary/30 shadow-lg shadow-primary/10' 
      : 'hover:bg-slate-800/50 border-slate-700/50',
    restaurant.unread_count > 0 && !isSelected && 'bg-amber-500/10 border-amber-500/20'
  )

  const avatarClasses = (isActive: boolean) => cn(
    'flex-shrink-0 size-12 rounded-xl flex items-center justify-center',
    isActive ? 'bg-emerald-500/20' : 'bg-rose-500/20'
  )

  const messageBubbleClasses = (isFromRestaurant: boolean, isOwn: boolean) => cn(
    'w-fit max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
    isFromRestaurant
      ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-sm'
      : (isOwn ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-emerald-950/40 text-emerald-100 border border-emerald-500/30 rounded-br-sm')
  )

  const senderNameClasses = (isFromRestaurant: boolean, isOwn: boolean) => cn(
    'text-xs font-medium mb-1 px-1',
    isFromRestaurant ? 'text-slate-400' : (isOwn ? 'hidden' : 'text-emerald-300')
  )

  const timeStampClasses = (isFromRestaurant: boolean, isOwn: boolean) => cn(
    'text-xs opacity-60',
    isFromRestaurant ? 'text-slate-500' : (isOwn ? 'text-blue-100' : 'text-emerald-300')
  )

  return (
    <div className='h-[calc(100vh-13rem)] flex flex-col'>
      <div className='shrink-0 px-4 py-3 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          {!hideSidebar && (
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setShowSidebar(!showSidebar)}
              className='md:hidden text-slate-400 hover:text-slate-100'
              aria-label={showSidebar ? 'إخفاء قائمة العملاء' : 'إظهار قائمة العملاء'}
            >
              {showSidebar ? <ChevronLeft className='size-5' /> : <ChevronRight className='size-5' />}
            </Button>
          )}
          <div>
            <h2 className='text-lg font-semibold text-slate-100'>التواصل المباشر</h2>
            <p className='text-xs text-slate-500'>{restaurants.length} مطعم مسجل</p>
          </div>
        </div>
        
        {!hideSidebar && (
          <div className='flex items-center gap-2'>
            <div className='relative hidden sm:block'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500' />
              <Input
                type='search'
                placeholder='ابحث بمطعم أو إيميل المالك...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-64 pl-9 pr-4 bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-primary/20'
              />
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={openInNewPage}
              disabled={!selectedRestaurantId}
              className='gap-1.5 hidden sm:flex'
            >
              <ExternalLink className='size-4' />
              فتح في صفحة مستقلة
            </Button>
          </div>
        )}
      </div>

      <div className='flex-1 flex overflow-hidden'>
        {!hideSidebar && (
          <aside className={sidebarClasses}>
            <div className='flex-1 overflow-y-auto p-2 space-y-1.5'>
              {filteredRestaurants.length === 0 ? (
                <div className='text-center py-8 text-slate-500'>
                  <Search className='mx-auto size-10 mb-3 opacity-30' />
                  <p className='text-sm'>لا توجد مطعمات مطابقة للبحث</p>
                </div>
              ) : (
                filteredRestaurants.map((restaurant) => {
                  const isSelected = selectedRestaurantId === restaurant.id
                  const msgType = (restaurant.last_message_type ?? 'chat') as NotificationType
                  const config = TYPE_CONFIG[msgType]
                  
                  return (
                    <Button
                      key={restaurant.id}
                      variant={isSelected ? 'default' : 'ghost'}
                      className={restaurantCardClasses(restaurant, isSelected)}
                      onClick={() => handleRestaurantSelect(restaurant.id)}
                    >
                      <div className={avatarClasses(restaurant.is_active)}>
                        {config.icon && (
                          (() => {
                            const IconComponent = config.icon
                            return IconComponent ? <IconComponent className='size-5' /> : null
                          })()
                        )}
                      </div>
                      <div className='flex-1 min-w-0 text-right'>
                        <div className='flex items-center justify-between gap-2'>
                          <h4 className={cn('font-medium text-sm truncate', isSelected ? 'text-slate-100' : 'text-slate-300')}>
                            {restaurant.name}
                          </h4>
                          {restaurant.unread_count > 0 && (
                            <Badge 
                              variant={isSelected ? 'secondary' : 'default'} 
                              className='text-xs px-2 py-0.5'
                            >
                              {restaurant.unread_count}
                            </Badge>
                          )}
                        </div>
                        <div className='flex items-center justify-between gap-2 mt-1'>
                          <p className={cn('text-xs truncate', isSelected ? 'text-primary/80' : 'text-slate-500')}>
                            {restaurant.owner_email}
                          </p>
                          {restaurant.last_message_at && (
                            <span className={cn('text-xs shrink-0', isSelected ? 'text-slate-500' : 'text-slate-600')}>
                              {formatRelativeTime(restaurant.last_message_at)}
                            </span>
                          )}
                        </div>
                        {restaurant.last_message && (
                          <p className={cn('text-xs truncate mt-1 line-clamp-1', isSelected ? 'text-slate-400' : 'text-slate-600')}>
                            {restaurant.last_message}
                          </p>
                        )}
                        {restaurant.is_typing && restaurant.typing_text && (
                          <div className='mt-1.5 flex items-center gap-1.5 text-amber-400 animate-pulse'>
                            <span className='size-1.5 rounded-full bg-amber-400'></span>
                            <span className='text-xs truncate flex-1'>{restaurant.typing_text.slice(0, 40)}</span>
                          </div>
                        )}
                      </div>
                    </Button>
                  )
                })
              )}
            </div>
            
            {isMobile && showSidebar && (
              <div className='md:hidden p-2 border-t border-slate-800'>
                <Button variant='ghost' size='sm' className='w-full' onClick={() => setShowSidebar(false)}>
                  <ChevronLeft className='mr-2 size-4' /> إغلاق القائمة
                </Button>
              </div>
            )}
          </aside>
        )}

        {!hideSidebar && isMobile && showSidebar && (
          <div 
            className='fixed inset-0 z-30 bg-black/50 md:hidden' 
            onClick={() => setShowSidebar(false)}
            aria-hidden='true'
          />
        )}

        <section className={chatAreaClasses}>
          {selectedRestaurant ? (
            <>
              <div className='shrink-0 px-4 py-3 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between gap-4'>
                <div className='flex items-center gap-3 min-w-0'>
                  <div className={cn(
                    'flex-shrink-0 size-10 rounded-xl flex items-center justify-center',
                    selectedRestaurant.is_active ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                  )}>
                    {(() => {
                      const msgType = (selectedRestaurant.last_message_type ?? 'chat') as NotificationType
                      const IconComponent = TYPE_CONFIG[msgType].icon
                      return IconComponent ? <IconComponent className='size-5' /> : null
                    })()}
                  </div>
                  <div className='min-w-0'>
                    <h3 className='font-semibold text-slate-100 truncate'>{selectedRestaurant.name}</h3>
                    <div className='flex items-center gap-2 text-xs text-slate-500'>
                      <span>{selectedRestaurant.owner_email}</span>
                      <Badge variant={selectedRestaurant.is_active ? 'default' : 'secondary'} className='text-[10px]'>
                        {selectedRestaurant.is_active ? 'نشط' : 'متوقف'}
                      </Badge>
                      {selectedRestaurant.subscription_ends_at && (
                        <Badge variant='outline' className='text-[10px]'>
                          {new Date(selectedRestaurant.subscription_ends_at) < new Date() ? 'منتهي' : 'ينتهي قريباً'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={openInNewPage}
                    className='gap-1.5'
                  >
                    <ExternalLink className='size-4' />
                    <span className='hidden sm:inline'>صفحة مستقلة</span>
                  </Button>
                </div>
              </div>

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

              <div className='flex-1 overflow-y-auto p-4 space-y-3' ref={messagesContainerRef}>
                {isLoadingMessages ? (
                  <div className='flex items-center justify-center h-full'>
                    <Loader2 className='size-10 animate-spin text-primary' />
                  </div>
                ) : messages.length === 0 ? (
                  <div className='flex flex-col items-center justify-center h-full text-slate-500'>
                    <MessageSquare className='size-16 mb-4 opacity-30' />
                    <p className='text-lg font-medium'>لا توجد رسائل بعد</p>
                    <p className='text-sm'>ابدأ المحادثة بإرسال أول رسالة</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const msgType = msg.type as NotificationType
                      const config = TYPE_CONFIG[msgType]
                      const isFromRestaurant = msg.sender_role === 'restaurant'
                      const isOwn = msg.sender_role === 'admin' && msg.sender_id === user?.id
                      const isSystemMessage = msg.type === 'subscription_warning' || msg.type === 'urgent'
                      const senderDisplayName = isFromRestaurant
                        ? (msg.sender_name ?? msg.sender_email ?? 'المطعم')
                        : (isOwn ? 'أنت' : (msg.sender_name ?? msg.sender_email ?? 'الإدارة'))

                      if (isSystemMessage) {
                        return (
                          <div key={msg.id} className='flex justify-center'>
                            <div className={`${config.color} w-fit max-w-[85%] rounded-2xl px-5 py-4 shadow-sm border`}>
                              <div className='flex items-start gap-3'>
                                {(() => {
                                  const IconComponent = config.icon
                                  return IconComponent ? <IconComponent className='size-5 shrink-0 mt-0.5' /> : null
                                })()}
                                <div className='flex-1 min-w-0'>
                                  <h4 className='font-medium text-sm'>{msg.title}</h4>
                                  <p className='mt-1 text-sm opacity-90 whitespace-pre-wrap'>{msg.message}</p>
                                  <div className='mt-3 flex items-center justify-between'>
                                    <span className='text-xs opacity-70'>
                                      {formatDateTime(msg.created_at)}
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

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex gap-2.5 transition-colors animate-fade-in',
                            isFromRestaurant ? 'flex-row' : 'flex-row-reverse'
                          )}
                        >
                          <div className={messageBubbleClasses(isFromRestaurant, isOwn)}>
                            {!isOwn && !isFromRestaurant && (
                              <div className={senderNameClasses(isFromRestaurant, isOwn)}>
                                {senderDisplayName}
                              </div>
                            )}
                            {isFromRestaurant && (
                              <div className={senderNameClasses(isFromRestaurant, isOwn)}>
                                {senderDisplayName}
                              </div>
                            )}
                            <p className='text-sm whitespace-pre-wrap'>{msg.message}</p>
                            <div className='flex items-center justify-end gap-2 mt-1.5'>
                              <span className={timeStampClasses(isFromRestaurant, isOwn)}>
                                {formatDateTime(msg.created_at)}
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

              <div className='shrink-0 border-t border-slate-800 bg-slate-950/90 backdrop-blur-sm p-3'>
                <form onSubmit={handleSendMessage} className='space-y-2'>
                  <div className='relative'>
                    <Textarea
                      id='admin-chat-message'
                      placeholder='اكتب ردك... (Enter للإرسال، Shift+Enter لسطر جديد)'
                      value={newMessage}
                      onChange={handleInputChange}
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
                    سيظهر ردك للعميل باسم: <strong>{adminDisplayName || 'جاري التحميل...'}</strong>
                  </p>
                </form>
              </div>
            </>
          ) : (
            <div className='flex-1 flex flex-col items-center justify-center text-slate-500 px-4'>
              <div className='mb-6 p-4 bg-slate-900/50 rounded-2xl border border-slate-800'>
                <MessageSquare className='mx-auto size-16 mb-4 opacity-30' />
                <h3 className='text-lg font-medium text-center text-slate-300'>
                  {hideSidebar ? 'جارٍ تحميل المحادثة...' : 'اختر مطعم للبدء'}
                </h3>
                <p className='text-sm text-center text-slate-500 mt-1'>
                  {hideSidebar ? 'سيتم فتح المحادثة تلقائياً' : 'اختر مطعم من القائمة الجانبية لعرض المحادثة والرد عليه'}
                </p>
              </div>
              {filteredRestaurants.length > 0 && !hideSidebar && (
                <div className='w-full max-w-md'>
                  <p className='text-sm font-medium text-slate-400 mb-3 text-center'>أو ابدأ محادثة جديدة مع:</p>
                  <div className='grid gap-2 sm:grid-cols-2'>
                    {filteredRestaurants.slice(0, 6).map((restaurant) => (
                      <Button
                        key={restaurant.id}
                        variant='outline'
                        className='h-20 flex-col gap-2 justify-center p-4'
                        onClick={() => handleRestaurantSelect(restaurant.id)}
                      >
                        <div className='font-medium text-sm'>{restaurant.name}</div>
                        <div className='text-xs text-slate-500 truncate max-w-[140px]'>{restaurant.owner_email}</div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}