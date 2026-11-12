import { useState } from 'react'
import { Plus, Eye, Trash2, Users, Activity, AlertCircle, CheckCircle, XCircle, Loader2, Shield, Bell, Mail, UserPlus, UserCheck, UserX, MessageSquare, Calendar, UtensilsCrossed, KeyRound, Copy, Eye as EyeIcon, EyeOff, ShieldCheck, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import {
  useRestaurants,
  useSuperAdminStats,
  usePlatformAdmins,
  usePlatformAdminStats,
  useNotifications,
  useNotificationStats,
  useToggleRestaurantActive,
  useUpdateRestaurant,
  useCreateRestaurant,
  useCreatePlatformAdmin,
  useTogglePlatformAdmin,
  useDeletePlatformAdmin,
  useDeleteRestaurant,
  useSendNotification,
  usePasswordAuditLogs,
  usePasswordAuditStats,
  useRootResetPassword,
  useMarkPasswordAuditRead,
  useRootChangeOwnPassword,
  type Restaurant,
  type CreateRestaurantInput,
  type PlatformAdmin,
  type CreatePlatformAdminInput,
  type SendNotificationInput,
  type PlatformNotification,
  type PasswordAuditLog,
} from './api'

const STATUS_BADGES = {
  active: { label: 'نشط', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  inactive: { label: 'متوقف', className: 'bg-rose-100 text-rose-800', icon: XCircle },
  expired: { label: 'منتهي', className: 'bg-amber-100 text-amber-800', icon: AlertCircle },
} as const

const NOTIFICATION_TYPE_BADGES = {
  subscription_warning: { label: 'تنبيه اشتراك', className: 'bg-amber-100 text-amber-800', icon: AlertCircle },
  urgent: { label: 'عاجل', className: 'bg-rose-100 text-rose-800', icon: AlertCircle },
  info: { label: 'معلومة', className: 'bg-blue-100 text-blue-800', icon: Mail },
  chat: { label: 'تواصل', className: 'bg-emerald-100 text-emerald-800', icon: MessageSquare },
} as const

const NOTIFICATION_TEMPLATES = {
  subscription_warning: {
    title: 'تنبيه: قرب انتهاء الاشتراك',
    message: 'عزيزي صاحب المطعم، يرجى العلم بأن اشتراكك في منصة Menuz سينتهي قريباً. يرجى التواصل مع الإدارة لتجديد الاشتراك لضمان استمرار الخدمة دون انقطاع.',
    type: 'subscription_warning' as const,
  },
  urgent: {
    title: 'إشعار عاجل من الإدارة',
    message: 'هذا إشعار عاجل يتطلب انتباهك الفوري. يرجى مراجعة الرسالة والتواصل معنا عند الحاجة.',
    type: 'urgent' as const,
  },
  info: {
    title: 'معلومة من إدارة المنصة',
    message: 'نود إعلامك بتحديثات جديدة أو معلومات هامة تخص حسابك.',
    type: 'info' as const,
  },
  chat: {
    title: 'طلب تواصل مع الإدارة',
    message: 'يرجى التواصل مع فريق الدعم الفني عبر القنوات المتاحة لمساعدتك في أي استفسارات أو مشاكل تواجهها.',
    type: 'chat' as const,
  },
} as const

const CHANGE_TYPE_BADGES = {
  own_change: { label: 'تغيير ذاتي', className: 'bg-blue-100 text-blue-800' },
  root_reset: { label: 'إعادة تعيين من المالك', className: 'bg-amber-100 text-amber-800' },
  initial_creation: { label: 'إنشاء أولي', className: 'bg-emerald-100 text-emerald-800' },
} as const

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ReadBadge() {
  return (
    <Badge variant='secondary' className='bg-emerald-100 text-emerald-800'>
      <CheckCircle className='mr-1 size-3' /> مقروء
    </Badge>
  )
}

function UnreadBadge() {
  return (
    <Badge variant='outline' className='bg-amber-100 text-amber-800'>
      <AlertCircle className='mr-1 size-3' /> غير مقروء
    </Badge>
  )
}

function getStatus(restaurant: Restaurant) {
  if (!restaurant.is_active) return 'inactive'
  if (restaurant.subscription_ends_at && new Date(restaurant.subscription_ends_at) < new Date()) return 'expired'
  return 'active'
}

function StatusCell({ restaurant }: { restaurant: Restaurant }) {
  const status = getStatus(restaurant)
  const config = STATUS_BADGES[status]
  const Icon = config.icon

  return (
    <Badge variant='outline' className={config.className}>
      <Icon className='mr-1 size-3' />
      {config.label}
    </Badge>
  )
}

function NotificationTypeBadge({ type }: { type: PlatformNotification['type'] }) {
  const config = NOTIFICATION_TYPE_BADGES[type]
  const Icon = config.icon
  return (
    <Badge variant='outline' className={config.className}>
      <Icon className='mr-1 size-3' />
      {config.label}
    </Badge>
  )
}

function ChangeTypeBadge({ type }: { type: PasswordAuditLog['change_type'] }) {
  const config = CHANGE_TYPE_BADGES[type]
  return (
    <Badge variant='outline' className={config.className}>
      {config.label}
    </Badge>
  )
}

function SubscriptionDateCell({ restaurant, onUpdate, isPending }: { restaurant: Restaurant; onUpdate: (date: string | null) => void; isPending: boolean }) {
  const currentDate = restaurant.subscription_ends_at ? new Date(restaurant.subscription_ends_at) : null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          disabled={isPending}
          className='w-full justify-start text-left h-auto py-1.5 px-2'
        >
          <Calendar className='mr-2 size-3' />
          {currentDate ? format(currentDate, 'yyyy/MM/dd', { locale: ar }) : 'غير محدد'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-64 p-2' side='bottom' align='start'>
        <Label className='block mb-2'>تاريخ انتهاء الاشتراك</Label>
        <Input
          type='date'
          value={currentDate ? format(currentDate, 'yyyy-MM-dd') : ''}
          onChange={(e) => onUpdate(e.target.value || null)}
          disabled={isPending}
          className='mb-2'
        />
        <div className='flex gap-2'>
          <Button size='sm' onClick={() => onUpdate(null)} variant='outline' disabled={isPending}>
            إزالة التاريخ
          </Button>
          <Button size='sm' onClick={() => onUpdate(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))} disabled={isPending}>
            +30 يوم
          </Button>
          <Button size='sm' onClick={() => onUpdate(format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))} disabled={isPending}>
            +سنة
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ActionCell({
  restaurant,
  onDelete,
  isDeletePending,
  onSendNotification,
  onResetPassword,
  isResetPasswordPending,
  isRootOwner,
}: {
  restaurant: Restaurant
  onDelete: () => void
  isDeletePending: boolean
  onSendNotification: () => void
  onResetPassword: () => void
  isResetPasswordPending: boolean
  isRootOwner: boolean
}) {
  return (
    <div className='flex items-center gap-1'>
      <Button
        variant='ghost'
        size='icon'
        onClick={() => window.open(`/menu/${restaurant.slug}`, '_blank')}
        title='فتح المنيو'
      >
        <Eye className='size-4' />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        onClick={onSendNotification}
        title='إرسال تنبيه / تواصل'
      >
        <MessageSquare className='size-4 text-blue-600' />
      </Button>
      {isRootOwner && (
        <>
          <Button
            variant='ghost'
            size='icon'
            onClick={onResetPassword}
            disabled={isResetPasswordPending}
            title='تغيير كلمة المرور'
            className='text-primary hover:bg-primary/10'
          >
            <KeyRound className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='text-rose-600 hover:bg-rose-50'
            onClick={onDelete}
            disabled={isDeletePending}
            title='حذف المطعم'
          >
            <Trash2 className='size-4' />
          </Button>
        </>
      )}
    </div>
  )
}

function AdminActionCell({
  admin,
  onToggle,
  isTogglePending,
  onDelete,
  isDeletePending,
  onResetPassword,
  isResetPasswordPending,
  isRootOwner,
}: {
  admin: PlatformAdmin
  onToggle: () => void
  isTogglePending: boolean
  onDelete: () => void
  isDeletePending: boolean
  onResetPassword: () => void
  isResetPasswordPending: boolean
  isRootOwner: boolean
}) {
  const isActive = admin.is_active

  return (
    <div className='flex items-center gap-1'>
      <Switch
        checked={isActive}
        onCheckedChange={onToggle}
        disabled={isTogglePending || admin.role === 'root_owner'}
        aria-label={isActive ? 'إيقاف المشرف' : 'تفعيل المشرف'}
      />
      {isRootOwner && admin.role !== 'root_owner' && (
        <>
          <Button
            variant='ghost'
            size='icon'
            onClick={onResetPassword}
            disabled={isResetPasswordPending}
            title='تغيير كلمة المرور'
            className='text-primary hover:bg-primary/10'
          >
            <KeyRound className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='text-rose-600 hover:bg-rose-50'
            onClick={onDelete}
            disabled={isDeletePending}
            title='حذف المشرف'
          >
            <Trash2 className='size-4' />
          </Button>
        </>
      )}
    </div>
  )
}

export function SuperAdminDashboard() {
  const { user } = useAuthStore()
  const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL
  const userEmail = user?.email
  const isRootOwner = superAdminEmail && userEmail === superAdminEmail

  const { data: restaurants = [], isLoading: restaurantsLoading } = useRestaurants()
  const { data: stats, isLoading: statsLoading } = useSuperAdminStats()
  const { data: admins = [], isLoading: adminsLoading } = usePlatformAdmins()
  const { data: adminStats, isLoading: adminStatsLoading } = usePlatformAdminStats()
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications()
  const { data: notificationStats, isLoading: notificationStatsLoading } = useNotificationStats()
  const { data: passwordAuditLogs = [], isLoading: passwordAuditLoading } = usePasswordAuditLogs()
  const { data: passwordAuditStats, isLoading: passwordAuditStatsLoading } = usePasswordAuditStats()

  const toggleMutation = useToggleRestaurantActive()
  const updateMutation = useUpdateRestaurant()
  const createMutation = useCreateRestaurant()
  const deleteMutation = useDeleteRestaurant()
  const createAdminMutation = useCreatePlatformAdmin()
  const toggleAdminMutation = useTogglePlatformAdmin()
  const deleteAdminMutation = useDeletePlatformAdmin()
  const sendNotificationMutation = useSendNotification()
  const rootResetPasswordMutation = useRootResetPassword()
  const markPasswordAuditReadMutation = useMarkPasswordAuditRead()
  const rootChangeOwnPasswordMutation = useRootChangeOwnPassword()

  const [activeTab, setActiveTab] = useState<'restaurants' | 'admins' | 'notifications' | 'password-audit'>('restaurants')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [notificationDialogOpen, setNotificationDialogOpen] = useState<{ open: boolean; restaurant?: Restaurant }>({ open: false })
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState<{ open: boolean; targetUserId?: string; targetEmail?: string; entityName?: string; targetType?: 'restaurant' | 'admin' }>({ open: false })
  const [rootOwnPasswordDialogOpen, setRootOwnPasswordDialogOpen] = useState(false)
  const [formData, setFormData] = useState<CreateRestaurantInput>({
    name: '',
    slug: '',
    owner_email: '',
    owner_password: '',
    phone: '',
  })
  const [adminFormData, setAdminFormData] = useState<CreatePlatformAdminInput>({
    email: '',
    password: '',
    full_name: '',
  })
  const [notificationFormData, setNotificationFormData] = useState<SendNotificationInput>({
    restaurant_id: '',
    title: '',
    message: '',
    type: 'info',
    contact_url: '',
  })
  const [resetPasswordFormData, setResetPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [rootOwnPasswordFormData, setRootOwnPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [showRootNewPassword, setShowRootNewPassword] = useState(false)
  const [showRootConfirmPassword, setShowRootConfirmPassword] = useState(false)
  const [rootOwnPasswordErrors, setRootOwnPasswordErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createMutation.mutateAsync(formData)
    setCreateDialogOpen(false)
    setFormData({ name: '', slug: '', owner_email: '', owner_password: '', phone: '' })
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createAdminMutation.mutateAsync(adminFormData)
    setCreateDialogOpen(false)
    setAdminFormData({ email: '', password: '', full_name: '' })
  }

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notificationFormData.restaurant_id) return
    await sendNotificationMutation.mutateAsync(notificationFormData)
    setNotificationDialogOpen({ open: false })
    setNotificationFormData({ restaurant_id: '', title: '', message: '', type: 'info', contact_url: '' })
  }

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المطعم؟ لا يمكن التراجع عن هذا الإجراء.')) {
      deleteMutation.mutate(id)
    }
  }

  const handleAdminDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المشرف؟ لا يمكن التراجع عن هذا الإجراء.')) {
      deleteAdminMutation.mutate(id)
    }
  }

  const openNotificationModal = (restaurant: Restaurant) => {
    setNotificationFormData({
      restaurant_id: restaurant.id,
      title: '',
      message: '',
      type: 'info',
      contact_url: '',
    })
    setNotificationDialogOpen({ open: true, restaurant })
  }

  const applyTemplate = (templateKey: keyof typeof NOTIFICATION_TEMPLATES) => {
    const template = NOTIFICATION_TEMPLATES[templateKey]
    setNotificationFormData(prev => ({
      ...prev,
      title: template.title,
      message: template.message,
      type: template.type,
    }))
  }

  const generatePassword = () => {
    const length = 16
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setResetPasswordFormData({ newPassword: password, confirmPassword: password })
  }

  const generateRootOwnPassword = () => {
    const length = 16
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setRootOwnPasswordFormData({ newPassword: password, confirmPassword: password })
  }

  const validateResetPasswordForm = (): boolean => {
    const errors: { newPassword?: string; confirmPassword?: string } = {}

    if (!resetPasswordFormData.newPassword) {
      errors.newPassword = 'كلمة المرور الجديدة مطلوبة'
    } else if (resetPasswordFormData.newPassword.length < 8) {
      errors.newPassword = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
    }

    if (!resetPasswordFormData.confirmPassword) {
      errors.confirmPassword = 'تأكيد كلمة المرور مطلوب'
    } else if (resetPasswordFormData.newPassword !== resetPasswordFormData.confirmPassword) {
      errors.confirmPassword = 'كلمات المرور غير متطابقة'
    }

    return Object.keys(errors).length === 0
  }

  const validateRootOwnPasswordForm = (): boolean => {
    const errors: { newPassword?: string; confirmPassword?: string } = {}

    if (!rootOwnPasswordFormData.newPassword) {
      errors.newPassword = 'كلمة المرور الجديدة مطلوبة'
    } else if (rootOwnPasswordFormData.newPassword.length < 8) {
      errors.newPassword = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
    }

    if (!rootOwnPasswordFormData.confirmPassword) {
      errors.confirmPassword = 'تأكيد كلمة المرور مطلوب'
    } else if (rootOwnPasswordFormData.newPassword !== rootOwnPasswordFormData.confirmPassword) {
      errors.confirmPassword = 'كلمات المرور غير متطابقة'
    }

    setRootOwnPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const openResetPasswordDialog = (targetUserId: string, targetEmail: string, entityName: string, targetType: 'restaurant' | 'admin') => {
    setResetPasswordDialogOpen({ open: true, targetUserId, targetEmail, entityName, targetType })
    setResetPasswordFormData({ newPassword: '', confirmPassword: '' })
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateResetPasswordForm()) return
    if (!resetPasswordDialogOpen.targetUserId || !resetPasswordDialogOpen.entityName) return

    await rootResetPasswordMutation.mutateAsync({
      targetUserId: resetPasswordDialogOpen.targetUserId,
      newPassword: resetPasswordFormData.newPassword,
      entityName: resetPasswordDialogOpen.entityName,
    })
    setResetPasswordDialogOpen({ open: false })
  }

  const handleRootOwnPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateRootOwnPasswordForm()) return

    await rootChangeOwnPasswordMutation.mutateAsync(rootOwnPasswordFormData.newPassword)
    setRootOwnPasswordDialogOpen(false)
    setRootOwnPasswordFormData({ newPassword: '', confirmPassword: '' })
    setRootOwnPasswordErrors({})
    setShowRootNewPassword(false)
    setShowRootConfirmPassword(false)
  }

  const handleMarkPasswordAuditRead = async (id: string) => {
    await markPasswordAuditReadMutation.mutateAsync(id)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('تم نسخ كلمة المرور')
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <Shield className='size-6 text-primary' />
          <h1 className='ml-3 text-2xl font-bold tracking-tight'>لوحة الإدارة العليا</h1>
        </div>
        <div className='flex items-center gap-2'>
          {isRootOwner && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                setRootOwnPasswordDialogOpen(true)
                setRootOwnPasswordFormData({ newPassword: '', confirmPassword: '' })
                setRootOwnPasswordErrors({})
                setShowRootNewPassword(false)
                setShowRootConfirmPassword(false)
              }}
              className='gap-1'
            >
              <ShieldCheck className='size-4' />
              تغيير كلمة مروري
            </Button>
          )}
          {activeTab === 'restaurants' && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className='mr-2 size-4' /> إضافة مطعم جديد
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-md'>
                <DialogHeader>
                  <DialogTitle>إضافة مطعم وحساب مالك جديد</DialogTitle>
                  <DialogDescription>
                    أدخل بيانات المطعم الجديد وسيتم إنشاء حساب للمالك تلقائياً
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4 mt-4'>
                  <div className='space-y-1.5'>
                    <Label>اسم المطعم</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder='مثال: مطعم الفهد'
                      required
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>الرابط المخصص (Slug)</Label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder='al-fahd-restaurant'
                      required
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>بريد المالك الإلكتروني</Label>
                    <Input
                      type='email'
                      value={formData.owner_email}
                      onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                      placeholder='owner@example.com'
                      required
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>كلمة المرور</Label>
                    <Input
                      type='password'
                      value={formData.owner_password}
                      onChange={(e) => setFormData({ ...formData, owner_password: e.target.value })}
                      placeholder='كلمة مرور قوية (8+ أحرف)'
                      required
                      minLength={8}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>رقم الهاتف (اختياري)</Label>
                    <Input
                      type='tel'
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder='+966 50 123 4567'
                    />
                  </div>
                  <DialogFooter>
                    <Button type='button' variant='outline' onClick={() => setCreateDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button type='submit' disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء المطعم'}
                    </Button>
                  </DialogFooter              >
                </form>
              </DialogContent>
            </Dialog>
          )}
          {activeTab === 'admins' && isRootOwner && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className='mr-2 size-4' /> إضافة مشرف جديد
                </Button>
              </DialogTrigger>
              <DialogContent className='max-w-md'>
                <DialogHeader>
                  <DialogTitle>إضافة مشرف مساعد جديد</DialogTitle>
                  <DialogDescription>
                    سيحصل المشرف على صلاحيات إدارة المطاعم وإرسال الإشعارات
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdminSubmit} className='space-y-4 mt-4'>
                  <div className='space-y-1.5'>
                    <Label>الاسم الكامل</Label>
                    <Input
                      value={adminFormData.full_name}
                      onChange={(e) => setAdminFormData({ ...adminFormData, full_name: e.target.value })}
                      placeholder='أحمد محمد'
                      required
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      type='email'
                      value={adminFormData.email}
                      onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                      placeholder='admin@example.com'
                      required
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>كلمة المرور</Label>
                    <Input
                      type='password'
                      value={adminFormData.password}
                      onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                      placeholder='كلمة مرور قوية (8+ أحرف)'
                      required
                      minLength={8}
                    />
                  </div>
                  <DialogFooter>
                    <Button type='button' variant='outline' onClick={() => setCreateDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button type='submit' disabled={createAdminMutation.isPending}>
                      {createAdminMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء المشرف'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'restaurants' | 'admins' | 'notifications' | 'password-audit')} className='w-full'>
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='restaurants'>
            <UtensilsCrossed className='mr-2 size-4' /> المطاعم
          </TabsTrigger>
          {isRootOwner && (
            <TabsTrigger value='admins'>
              <Users className='mr-2 size-4' /> فريق الإدارة
            </TabsTrigger>
          )}
          <TabsTrigger value='notifications'>
            <Bell className='mr-2 size-4' /> الإشعارات
            {notificationStats && notificationStats.unread_notifications > 0 && (
              <span className='ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-medium text-white'>
                {notificationStats.unread_notifications}
              </span>
            )}
          </TabsTrigger>
          {isRootOwner && (
            <TabsTrigger value='password-audit'>
              <KeyRound className='mr-2 size-4' /> سجل كلمات المرور
              {passwordAuditStats && passwordAuditStats.unread_changes > 0 && (
                <span className='ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-medium text-white'>
                  {passwordAuditStats.unread_changes}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value='restaurants' className='mt-4'>
          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>إجمالي المطاعم</CardTitle>
                <Users className='size-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stats?.total_restaurants ?? 0}</div>
                <p className='text-xs text-muted-foreground'>مطعم مسجل في النظام</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>مطاعم نشطة</CardTitle>
                <Activity className='size-4 text-emerald-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-emerald-600'>{stats?.active_restaurants ?? 0}</div>
                <p className='text-xs text-muted-foreground'>تعمل بشكل طبيعي</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>مطاعم متوقفة / منتهية</CardTitle>
                <AlertCircle className='size-4 text-rose-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-rose-600'>
                  {(stats?.inactive_restaurants ?? 0) + (stats?.expired_subscriptions ?? 0)}
                </div>
                <p className='text-xs text-muted-foreground'>تحتاج متابعة أو تجديد اشتراك</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>تنتهي قريباً (7 أيام)</CardTitle>
                <Calendar className='size-4 text-amber-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-amber-600'>{stats?.expiring_soon ?? 0}</div>
                <p className='text-xs text-muted-foreground'>تحتاج تنبيه بالتجديد</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>إدارة المطاعم</CardTitle>
            </CardHeader>
            <CardContent>
              {(restaurantsLoading || statsLoading) ? (
                <div className='flex h-64 items-center justify-center'>
                  <Loader2 className='size-8 animate-spin text-primary' />
                </div>
              ) : restaurants.length === 0 ? (
                <div className='text-center py-12 text-muted-foreground'>
                  <Users className='mx-auto size-12 mb-3 text-muted-foreground/50' />
                  <p className='text-lg font-medium'>لا توجد مطاعم مسجلة</p>
                  <p className='text-sm'>ابدأ بإضافة أول مطعم</p>
                </div>
              ) : (
                <ScrollArea className='max-h-[600px]'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-[40px]'>الحالة</TableHead>
                        <TableHead>المطعم</TableHead>
                        <TableHead>الرابط</TableHead>
                        <TableHead>إيميل المالك</TableHead>
                        <TableHead>تاريخ الإنشاء</TableHead>
                        <TableHead>انتهاء الاشتراك</TableHead>
                        <TableHead className='w-[160px]'>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {restaurants.map((restaurant) => {
                        const isPendingUpdate = updateMutation.isPending && updateMutation.variables?.id === restaurant.id
                        const isPendingDelete = deleteMutation.isPending && deleteMutation.variables === restaurant.id

                        return (
                          <TableRow key={restaurant.id}>
                            <TableCell>
                              <div className='flex items-center gap-2'>
                                <StatusCell restaurant={restaurant} />
                                <Switch
                                  checked={restaurant.is_active}
                                  onCheckedChange={(checked) => toggleMutation.mutate({ id: restaurant.id, isActive: checked })}
                                  disabled={toggleMutation.isPending && toggleMutation.variables?.id === restaurant.id}
                                  aria-label={restaurant.is_active ? 'إيقاف المطعم' : 'تفعيل المطعم'}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className='font-medium'>{restaurant.name}</div>
                              {restaurant.name_ar && (
                                <div className='text-sm text-muted-foreground'>{restaurant.name_ar}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className='text-sm text-muted-foreground font-mono'>
                                /menu/{restaurant.slug}
                              </code>
                            </TableCell>
                            <TableCell>{restaurant.owner_email ?? '—'}</TableCell>
                            <TableCell>{formatDate(restaurant.created_at)}</TableCell>
                            <TableCell>
                              <SubscriptionDateCell
                                restaurant={restaurant}
                                onUpdate={(date) => updateMutation.mutate({ id: restaurant.id, updates: { subscription_ends_at: date } })}
                                isPending={isPendingUpdate}
                              />
                            </TableCell>
                            <TableCell>
                              <ActionCell
                                restaurant={restaurant}
                                onDelete={() => handleDelete(restaurant.id)}
                                isDeletePending={isPendingDelete}
                                onSendNotification={() => openNotificationModal(restaurant)}
                                onResetPassword={() => openResetPasswordDialog(restaurant.owner_id, restaurant.owner_email || '', restaurant.name, 'restaurant')}
                                isResetPasswordPending={rootResetPasswordMutation.isPending && rootResetPasswordMutation.variables?.targetUserId === restaurant.owner_id}
                                isRootOwner={isRootOwner}
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isRootOwner && (
          <TabsContent value='admins' className='mt-4'>
            <div className='grid gap-4 md:grid-cols-3'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>المالك الأعلى</CardTitle>
                  <UserCheck className='size-4 text-emerald-600' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{adminStats?.root_owners ?? 0}</div>
                  <p className='text-xs text-muted-foreground'>حساب المالك الأعلى</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>مشرفين نشطين</CardTitle>
                  <UserCheck className='size-4 text-blue-600' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold text-blue-600'>{adminStats?.active_sub_admins ?? 0}</div>
                  <p className='text-xs text-muted-foreground'>يمكنهم إدارة المطاعم</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>مشرفين موقوفين</CardTitle>
                  <UserX className='size-4 text-rose-600' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold text-rose-600'>{adminStats?.inactive_sub_admins ?? 0}</div>
                  <p className='text-xs text-muted-foreground'>غير فعّالين حالياً</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>فريق الإدارة (المشرفين)</CardTitle>
              </CardHeader>
              <CardContent>
                {(adminsLoading || adminStatsLoading) ? (
                  <div className='flex h-64 items-center justify-center'>
                    <Loader2 className='size-8 animate-spin text-primary' />
                  </div>
                ) : admins.length === 0 ? (
                  <div className='text-center py-12 text-muted-foreground'>
                    <Users className='mx-auto size-12 mb-3 text-muted-foreground/50' />
                    <p className='text-lg font-medium'>لا يوجد مشرفين مساعدين</p>
                    <p className='text-sm'>أضف أول مشرف مساعد لتوزيع المهام</p>
                  </div>
                ) : (
                  <ScrollArea className='max-h-[600px]'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='w-[40px]'>الحالة</TableHead>
                          <TableHead>المشرف</TableHead>
                          <TableHead>البريد الإلكتروني</TableHead>
                          <TableHead>الدور</TableHead>
                          <TableHead>تاريخ الإنشاء</TableHead>
                          <TableHead className='w-[120px]'>إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {admins.map((admin) => {
                          const isPendingToggle = toggleAdminMutation.isPending && toggleAdminMutation.variables?.id === admin.id
                          const isPendingDelete = deleteAdminMutation.isPending && deleteAdminMutation.variables === admin.id

                          return (
                            <TableRow key={admin.id}>
                              <TableCell>
                                <Badge variant='outline' className={admin.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>
                                  {admin.is_active ? 'نشط' : 'موقوف'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className='font-medium'>{admin.full_name ?? '—'}</div>
                              </TableCell>
                              <TableCell>{admin.email}</TableCell>
                              <TableCell>
                                <Badge variant={admin.role === 'root_owner' ? 'default' : 'secondary'}>
                                  {admin.role === 'root_owner' ? 'المالك الأعلى' : 'مشرف مساعد'}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(admin.created_at)}</TableCell>
                              <TableCell>
                                <AdminActionCell
                                  admin={admin}
                                  onToggle={() => toggleAdminMutation.mutate({ id: admin.id, isActive: !admin.is_active })}
                                  isTogglePending={isPendingToggle}
                                  onDelete={() => handleAdminDelete(admin.id)}
                                  isDeletePending={isPendingDelete}
                                  onResetPassword={() => openResetPasswordDialog(admin.user_id, admin.email, admin.full_name || admin.email, 'admin')}
                                  isResetPasswordPending={rootResetPasswordMutation.isPending && rootResetPasswordMutation.variables?.targetUserId === admin.user_id}
                                  isRootOwner={isRootOwner}
                                />
</TableCell>
                            </TableRow>
)
                      }
                    )}
                      </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value='notifications' className='mt-4'>
          <div className='grid gap-4 md:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>إجمالي الإشعارات</CardTitle>
                <Bell className='size-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{notificationStats?.total_notifications ?? 0}</div>
                <p className='text-xs text-muted-foreground'>تم إرسالها</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>غير مقروءة</CardTitle>
                <AlertCircle className='size-4 text-rose-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-rose-600'>{notificationStats?.unread_notifications ?? 0}</div>
                <p className='text-xs text-muted-foreground'>بانتظار القراءة</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>عاجلة</CardTitle>
                <AlertCircle className='size-4 text-amber-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-amber-600'>{notificationStats?.urgent_notifications ?? 0}</div>
                <p className='text-xs text-muted-foreground'>تحتاج متابعة فورية</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>تنبيهات الاشتراك</CardTitle>
                <Calendar className='size-4 text-blue-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-blue-600'>{notificationStats?.subscription_warnings ?? 0}</div>
                <p className='text-xs text-muted-foreground'>قرب انتهاء الاشتراك</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle>سجل الإشعارات المرسلة</CardTitle>
                <Button variant='outline' size='sm' onClick={() => setNotificationDialogOpen({ open: true, restaurant: undefined })}>
                  <Plus className='mr-2 size-4' /> إرسال إشعار جديد
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(notificationsLoading || notificationStatsLoading) ? (
                <div className='flex h-64 items-center justify-center'>
                  <Loader2 className='size-8 animate-spin text-primary' />
                </div>
              ) : notifications.length === 0 ? (
                <div className='text-center py-12 text-muted-foreground'>
                  <Bell className='mx-auto size-12 mb-3 text-muted-foreground/50' />
                  <p className='text-lg font-medium'>لا توجد إشعارات مرسلة</p>
                  <p className='text-sm'>ابدأ بإرسال أول إشعار للمطاعم</p>
                </div>
              ) : (
                <ScrollArea className='max-h-[600px]'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-[100px]'>النوع</TableHead>
                        <TableHead>المطعم</TableHead>
                        <TableHead>العنوان</TableHead>
                        <TableHead>الرسالة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead className='w-[100px]'>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((notification) => {
                        return (
                          <TableRow key={notification.id} className={notification.is_read ? 'bg-muted/30' : ''}>
                            <TableCell>
                              <NotificationTypeBadge type={notification.type} />
                            </TableCell>
                            <TableCell>
                              <div className='font-medium'>{notification.restaurant?.name ?? '—'}</div>
                              <div className='text-sm text-muted-foreground font-mono'>/menu/{notification.restaurant?.slug ?? '—'}</div>
                            </TableCell>
                            <TableCell>{notification.title}</TableCell>
                            <TableCell>
                              <div className='max-w-xs truncate'>{notification.message}</div>
                            </TableCell>
                            <TableCell>{formatDateTime(notification.created_at)}</TableCell>
                            <TableCell>
                              {notification.is_read ? <ReadBadge /> : <UnreadBadge />}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isRootOwner && (
          <TabsContent value='password-audit' className='mt-4'>
            <div className='grid gap-4 md:grid-cols-5'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>إجمالي التغييرات</CardTitle>
                  <KeyRound className='size-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{passwordAuditStats?.total_changes ?? 0}</div>
                  <p className='text-xs text-muted-foreground'>عملية تغيير كلمة مرور</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>غير مقروءة</CardTitle>
                  <AlertCircle className='size-4 text-rose-600' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold text-rose-600'>{passwordAuditStats?.unread_changes ?? 0}</div>
                  <p className='text-xs text-muted-foreground'>بانتظار الاطلاع</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>تغييرات ذاتية</CardTitle>
                  <RotateCcw className='size-4 text-blue-600' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold text-blue-600'>{passwordAuditStats?.own_changes ?? 0}</div>
                  <p className='text-xs text-muted-foreground'>من أصحاب الحسابات</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>إعادة تعيين من المالك</CardTitle>
                  <ShieldCheck className='size-4 text-amber-600' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold text-amber-600'>{passwordAuditStats?.root_resets ?? 0}</div>
                  <p className='text-xs text-muted-foreground'>بواسطة المالك الأعلى</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>كلمات مرور أولية</CardTitle>
                  <UserPlus className='size-4 text-emerald-600' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold text-emerald-600'>{passwordAuditStats?.initial_creations ?? 0}</div>
                  <p className='text-xs text-muted-foreground'>عند إنشاء الحسابات</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>سجل تغييرات كلمات المرور</CardTitle>
              </CardHeader>
              <CardContent>
                {(passwordAuditLoading || passwordAuditStatsLoading) ? (
                  <div className='flex h-64 items-center justify-center'>
                    <Loader2 className='size-8 animate-spin text-primary' />
                  </div>
                ) : passwordAuditLogs.length === 0 ? (
                  <div className='text-center py-12 text-muted-foreground'>
                    <KeyRound className='mx-auto size-12 mb-3 text-muted-foreground/50' />
                    <p className='text-lg font-medium'>لا توجد تغييرات مسجلة</p>
                    <p className='text-sm'>سيظهر سجل تغييرات كلمات المرور هنا</p>
                  </div>
                ) : (
                  <ScrollArea className='max-h-[600px]'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='w-[100px]'>النوع</TableHead>
                          <TableHead>الكيان / المشرف</TableHead>
                          <TableHead>البريد الإلكتروني</TableHead>
                          <TableHead className='w-[200px]'>كلمة المرور</TableHead>
                          <TableHead>تم التغيير بواسطة</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead className='w-[100px]'>الحالة</TableHead>
                          <TableHead className='w-[100px]'>إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {passwordAuditLogs.map((log) => {
                          const [showPassword, setShowPassword] = useState(false)
                          return (
                            <TableRow key={log.id} className={log.is_read ? 'bg-muted/30' : ''}>
                              <TableCell>
                                <ChangeTypeBadge type={log.change_type} />
                              </TableCell>
                              <TableCell>
                                <div className='font-medium'>{log.entity_name ?? '—'}</div>
                              </TableCell>
                              <TableCell>{log.target_email}</TableCell>
                              <TableCell>
                                <div className='flex items-center gap-2'>
                                  <code className='text-sm font-mono flex-1 break-all'>
                                    {showPassword ? log.new_password : '••••••••'}
                                  </code>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={() => setShowPassword(!showPassword)}
                                    className='h-8 w-8 p-0'
                                    title={showPassword ? 'إخفاء' : 'إظهار'}
                                  >
                                    {showPassword ? <EyeOff className='size-4' /> : <EyeIcon className='size-4' />}
                                  </Button>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={() => copyToClipboard(log.new_password)}
                                    className='h-8 w-8 p-0'
                                    title='نسخ'
                                  >
                                    <Copy className='size-4' />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className='font-medium'>{log.changed_by_email}</div>
                                <div className='text-xs text-muted-foreground'>
                                  {log.change_type === 'root_reset' ? 'المالك الأعلى' :
                                   log.change_type === 'initial_creation' ? 'عند الإنشاء' : 'صاحب الحساب'}
                                </div>
                              </TableCell>
                              <TableCell>{formatDateTime(log.created_at)}</TableCell>
                              <TableCell>
                                {log.is_read ? <ReadBadge /> : <UnreadBadge />}
                              </TableCell>
                              <TableCell>
                                {!log.is_read && (
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => handleMarkPasswordAuditRead(log.id)}
                                    disabled={markPasswordAuditReadMutation.isPending && markPasswordAuditReadMutation.variables === log.id}
                                    className='gap-1'
                                  >
                                    <CheckCircle className='size-3' />
                                    تم الاطلاع
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Restaurant Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        {activeTab === 'restaurants' && (
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle>إضافة مطعم وحساب مالك جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات المطعم الجديد وسيتم إنشاء حساب للمالك تلقائياً
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className='space-y-4 mt-4'>
              <div className='space-y-1.5'>
                <Label>اسم المطعم</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder='مثال: مطعم الفهد'
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label>الرابط المخصص (Slug)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder='al-fahd-restaurant'
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label>بريد المالك الإلكتروني</Label>
                <Input
                  type='email'
                  value={formData.owner_email}
                  onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                  placeholder='owner@example.com'
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label>كلمة المرور</Label>
                <Input
                  type='password'
                  value={formData.owner_password}
                  onChange={(e) => setFormData({ ...formData, owner_password: e.target.value })}
                  placeholder='كلمة مرور قوية (8+ أحرف)'
                  required
                  minLength={8}
                />
              </div>
              <div className='space-y-1.5'>
                <Label>رقم الهاتف (اختياري)</Label>
                <Input
                  type='tel'
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder='+966 50 123 4567'
                />
              </div>
              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setCreateDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء المطعم'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
        {activeTab === 'admins' && isRootOwner && (
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle>إضافة مشرف مساعد جديد</DialogTitle>
              <DialogDescription>
                سيحصل المشرف على صلاحيات إدارة المطاعم وإرسال الإشعارات
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdminSubmit} className='space-y-4 mt-4'>
              <div className='space-y-1.5'>
                <Label>الاسم الكامل</Label>
                <Input
                  value={adminFormData.full_name}
                  onChange={(e) => setAdminFormData({ ...adminFormData, full_name: e.target.value })}
                  placeholder='أحمد محمد'
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label>البريد الإلكتروني</Label>
                <Input
                  type='email'
                  value={adminFormData.email}
                  onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                  placeholder='admin@example.com'
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label>كلمة المرور</Label>
                <Input
                  type='password'
                  value={adminFormData.password}
                  onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                  placeholder='كلمة مرور قوية (8+ أحرف)'
                  required
                  minLength={8}
                />
              </div>
              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setCreateDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type='submit' disabled={createAdminMutation.isPending}>
                  {createAdminMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء المشرف'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notificationDialogOpen.open} onOpenChange={() => setNotificationDialogOpen({ open: false })}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>إرسال تنبيه / تواصل للمطعم</DialogTitle>
            <DialogDescription>
              اختر المطعم واملأ بيانات الإشعار. سيتم حفظه في قاعدة البيانات وإظهاره لصاحب المطعم
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNotificationSubmit} className='space-y-4 mt-4'>
            {notificationDialogOpen.restaurant && (
              <div className='p-3 bg-blue-50 rounded-lg border border-blue-200'>
                <p className='text-sm font-medium'>إرسال إلى: {notificationDialogOpen.restaurant.name}</p>
                <p className='text-xs text-muted-foreground'>/menu/{notificationDialogOpen.restaurant.slug}</p>
              </div>
            )}
            {!notificationDialogOpen.restaurant && (
              <div className='space-y-1.5'>
                <Label>اختر المطعم *</Label>
                <Select value={notificationFormData.restaurant_id} onValueChange={(v) => setNotificationFormData({ ...notificationFormData, restaurant_id: v })} required>
                  <SelectTrigger>
                    <SelectValue placeholder='ابحث عن مطعم...' />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} (/menu/{r.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className='space-y-1.5'>
              <Label>نوع التنبيه *</Label>
              <Select value={notificationFormData.type} onValueChange={(v) => setNotificationFormData({ ...notificationFormData, type: v as SendNotificationInput['type'] })} required>
                <SelectTrigger>
                  <SelectValue placeholder='اختر نوع التنبيه' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='subscription_warning'>تنبيه قرب انتهاء الاشتراك</SelectItem>
                  <SelectItem value='urgent'>إشعار عاجل</SelectItem>
                  <SelectItem value='info'>معلومة عامة</SelectItem>
                  <SelectItem value='chat'>طلب تواصل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <Label>عنوان الإشعار *</Label>
              <Input
                value={notificationFormData.title}
                onChange={(e) => setNotificationFormData({ ...notificationFormData, title: e.target.value })}
                placeholder='عنوان الإشعار'
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label>نص الإشعار *</Label>
              <Textarea
                value={notificationFormData.message}
                onChange={(e) => setNotificationFormData({ ...notificationFormData, message: e.target.value })}
                placeholder='نص الإشعار...'
                rows={4}
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label>رابط تواصل مباشر (اختياري)</Label>
              <Input
                value={notificationFormData.contact_url}
                onChange={(e) => setNotificationFormData({ ...notificationFormData, contact_url: e.target.value })}
                placeholder='https://wa.me/... أو رابط دردشة'
              />
            </div>
            <div className='flex flex-wrap gap-2 p-3 bg-muted rounded-lg'>
              <Label className='text-sm font-medium'>قوالب سريعة:</Label>
              {(Object.keys(NOTIFICATION_TEMPLATES) as Array<keyof typeof NOTIFICATION_TEMPLATES>).map((key) => (
                <Button
                  key={key}
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => applyTemplate(key)}
                  className='text-xs'
                >
                  {NOTIFICATION_TEMPLATES[key].title}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setNotificationDialogOpen({ open: false })}>
                إلغاء
              </Button>
              <Button type='submit' disabled={sendNotificationMutation.isPending}>
                {sendNotificationMutation.isPending ? 'جاري الإرسال...' : 'إرسال الإشعار'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen.open} onOpenChange={() => setResetPasswordDialogOpen({ open: false })}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
            <DialogDescription>
              أدخل كلمة المرور الجديدة لـ {resetPasswordDialogOpen.entityName || 'المستخدم المحدد'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPasswordSubmit} className='space-y-4 mt-4'>
            <div className='space-y-2'>
              <Label htmlFor='reset-new-password'>كلمة المرور الجديدة</Label>
              <div className='relative'>
                <Input
                  id='reset-new-password'
                  type='password'
                  value={resetPasswordFormData.newPassword}
                  onChange={(e) => setResetPasswordFormData({ ...resetPasswordFormData, newPassword: e.target.value })}
                  placeholder='كلمة مرور قوية (8+ أحرف)'
                  disabled={rootResetPasswordMutation.isPending}
                  minLength={8}
                />
              </div>
            </div>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='reset-confirm-password'>تأكيد كلمة المرور الجديدة</Label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={generatePassword}
                  disabled={rootResetPasswordMutation.isPending}
                  className='gap-1'
                >
                  <RotateCcw className='size-3' />
                  توليد كلمة مرور قوية
                </Button>
              </div>
              <div className='relative'>
                <Input
                  id='reset-confirm-password'
                  type='password'
                  value={resetPasswordFormData.confirmPassword}
                  onChange={(e) => setResetPasswordFormData({ ...resetPasswordFormData, confirmPassword: e.target.value })}
                  placeholder='أعد إدخال كلمة المرور الجديدة'
                  disabled={rootResetPasswordMutation.isPending}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setResetPasswordDialogOpen({ open: false })}>
                إلغاء
              </Button>
              <Button type='submit' disabled={rootResetPasswordMutation.isPending}>
                {rootResetPasswordMutation.isPending ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Root Owner Change Own Password Dialog */}
      <Dialog open={rootOwnPasswordDialogOpen} onOpenChange={setRootOwnPasswordDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>تغيير كلمة مرور المالك الأعلى</DialogTitle>
            <DialogDescription>
              أدخل كلمة المرور الجديدة لحسابك. لا تحتاج لكلمة المرور القديمة.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRootOwnPasswordSubmit} className='space-y-4 mt-4'>
            <div className='space-y-2'>
              <Label htmlFor='root-new-password'>كلمة المرور الجديدة</Label>
              <div className='relative'>
                <Input
                  id='root-new-password'
                  type={showRootNewPassword ? 'text' : 'password'}
                  value={rootOwnPasswordFormData.newPassword}
                  onChange={(e) => setRootOwnPasswordFormData({ ...rootOwnPasswordFormData, newPassword: e.target.value })}
                  placeholder='كلمة مرور قوية (8+ أحرف)'
                  disabled={rootChangeOwnPasswordMutation.isPending}
                  minLength={8}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='absolute inset-y-0 r-0'
                  onClick={() => setShowRootNewPassword(!showRootNewPassword)}
                  disabled={rootChangeOwnPasswordMutation.isPending}
                >
                  {showRootNewPassword ? <EyeOff className='size-4' /> : <EyeIcon className='size-4' />}
                </Button>
              </div>
              {rootOwnPasswordErrors.newPassword && (
                <p className='text-xs text-destructive'>{rootOwnPasswordErrors.newPassword}</p>
              )}
            </div>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='root-confirm-password'>تأكيد كلمة المرور الجديدة</Label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={generateRootOwnPassword}
                  disabled={rootChangeOwnPasswordMutation.isPending}
                  className='gap-1'
                >
                  <RotateCcw className='size-3' />
                  توليد كلمة مرور قوية
                </Button>
              </div>
              <div className='relative'>
                <Input
                  id='root-confirm-password'
                  type={showRootConfirmPassword ? 'text' : 'password'}
                  value={rootOwnPasswordFormData.confirmPassword}
                  onChange={(e) => setRootOwnPasswordFormData({ ...rootOwnPasswordFormData, confirmPassword: e.target.value })}
                  placeholder='أعد إدخال كلمة المرور الجديدة'
                  disabled={rootChangeOwnPasswordMutation.isPending}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='absolute inset-y-0 r-0'
                  onClick={() => setShowRootConfirmPassword(!showRootConfirmPassword)}
                  disabled={rootChangeOwnPasswordMutation.isPending}
                >
                  {showRootConfirmPassword ? <EyeOff className='size-4' /> : <EyeIcon className='size-4' />}
                </Button>
              </div>
              {rootOwnPasswordErrors.confirmPassword && (
                <p className='text-xs text-destructive'>{rootOwnPasswordErrors.confirmPassword}</p>
              )}
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setRootOwnPasswordDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type='submit' disabled={rootChangeOwnPasswordMutation.isPending}>
                {rootChangeOwnPasswordMutation.isPending ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}