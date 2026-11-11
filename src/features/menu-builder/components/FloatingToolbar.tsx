'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Plus,
  Save,
  CloudUpload,
  Settings,
  X,
  Image as ImageIcon,
  Maximize,
  RotateCcw,
  Link,
  Copy,
  ExternalLink,
  Pencil,
  MapPin,
  Phone,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadMenuImage, getMenuImageUrl, supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  useCheckSlugAvailability,
  useUpdateRestaurantSlug,
} from '@/features/branding/api'
import { useMenuBuilderStore } from '../store'
import { isLockedMenuTemplate, type LayoutTemplate, type MenuTemplateId } from '../types'

export const MENU_THEMES: {
  id: MenuTemplateId
  label: string
  description: string
  accentColor: string
  themeMode: 'light' | 'dark'
  layoutTemplate: LayoutTemplate
}[] = [
  {
    id: 'aurora',
    label: 'أورا',
    description: 'مشرق ومرن',
    accentColor: '#ed6a3a',
    themeMode: 'light',
    layoutTemplate: 'grid-cards',
  },
  {
    id: 'noir',
    label: 'نوار',
    description: 'داكن وفاخر',
    accentColor: '#d7b46a',
    themeMode: 'dark',
    layoutTemplate: 'grid-cards',
  },
  {
    id: 'souk',
    label: 'سوق',
    description: 'عراقي أصيل',
    accentColor: '#a84d2a',
    themeMode: 'light',
    layoutTemplate: 'list-categories',
  },
  {
    id: 'volt',
    label: 'فولت',
    description: 'نيون جريء',
    accentColor: '#44e7b6',
    themeMode: 'dark',
    layoutTemplate: 'list-categories',
  },
  {
    id: 'bustan',
    label: 'بستان',
    description: 'طبيعي هادئ',
    accentColor: '#478b5e',
    themeMode: 'light',
    layoutTemplate: 'list-categories',
  },
  {
    id: 'ivory',
    label: 'آيفوري',
    description: 'أوف وايت مزخرف',
    accentColor: '#8a6a42',
    themeMode: 'light',
    layoutTemplate: 'list-categories',
  },
  {
    id: 'neon',
    label: 'نيون برو',
    description: 'تأثير متحرك',
    accentColor: '#00f5d4',
    themeMode: 'dark',
    layoutTemplate: 'visual-categories',
  },
  {
    id: 'majesty',
    label: 'ماجستي',
    description: 'فخم وذهبي',
    accentColor: '#c9a44b',
    themeMode: 'dark',
    layoutTemplate: 'visual-categories',
  },
  {
    id: 'cafe',
    label: 'كافيه',
    description: 'قهوة وحلويات',
    accentColor: '#805636',
    themeMode: 'light',
    layoutTemplate: 'grid-cards',
  },
  {
    id: 'market',
    label: 'ماركت',
    description: 'متجر إلكتروني',
    accentColor: '#3157d5',
    themeMode: 'light',
    layoutTemplate: 'grid-cards',
  },
  {
    id: 'modern',
    label: 'منيو العصري',
    description: 'أقسام مصوّرة',
    accentColor: '#6d3df5',
    themeMode: 'light',
    layoutTemplate: 'visual-categories',
  },
  {
    id: 'delivery',
    label: 'دليفري',
    description: 'تطبيق توصيل',
    accentColor: '#ff5a1f',
    themeMode: 'light',
    layoutTemplate: 'list-categories',
  },
  {
    id: 'delivery-app',
    label: 'قالب تطبيقات التوصيل',
    description: 'واجهة تطبيق توصيل احترافية',
    accentColor: '#ea580c',
    themeMode: 'light',
    layoutTemplate: 'list-categories',
  },
]

interface FloatingToolbarProps {
  /** عند استخدامه داخل لوحة المحرر لا يغطي محتوى الصفحة. */
  embedded?: boolean
}

export function FloatingToolbar({ embedded = false }: FloatingToolbarProps) {
  const {
    addCategory,
    publish,
    isPublishing,
    publishStatus,
    addItem,
    setMenuStyle,
    restoreOriginalStyle,
    style,
    removeBannerUrl,
    uploadBanner,
    setRestaurantName,
    setRestaurantDescription,
    setRestaurantLogoUrl,
    setGoogleMapsUrl,
    setWazeUrl,
    restaurantId,
    restaurantSlug,
    restaurantName,
    restaurantDescription,
    restaurantLogoUrl,
    googleMapsUrl,
    wazeUrl,
  } = useMenuBuilderStore()
  const { categories } = useMenuBuilderStore()
  const templateLocked = isLockedMenuTemplate(style.menuTemplate)

  const [styleOpen, setStyleOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const adInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  /* Croper modal state */
  const [cropOpen, setCropOpen] = useState(false)
  const [cropImageUrl, setCropImageUrl] = useState('')
  const [cropRotation, setCropRotation] = useState(0)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 })

  const setIsOpen = (open: boolean) => {
    setMenuStyle({ isOpen: open })
    if (!restaurantId) return
    void supabase
      .from('restaurants')
      .update({ is_open: open })
      .eq('id', restaurantId)
      .then(({ error }) => {
        if (error) toast.error('تعذر تحديث حالة المطعم. اضغط حفظ ونشر المنيو.')
        else toast.success(open ? 'المطعم مفتوح الآن.' : 'تم إغلاق المطعم مؤقتًا.')
      })
  }

  const readImageFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    readImageFile(file).then((url) => {
      setCropImageUrl(url)
      setCropOpen(true)
    })
    e.target.value = ''
  }

  const handleCropCancel = useCallback(() => {
    setCropOpen(false)
    setCropImageUrl('')
    setPendingFile(null)
    setCropRotation(0)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setIsDragging(false)
    setLastPosition({ x: 0, y: 0 })
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    setLastPosition({ x: e.clientX, y: e.clientY })
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const dx = e.clientX - lastPosition.x
    const dy = e.clientY - lastPosition.y
    setCrop((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    setLastPosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((prev) => Math.min(3, Math.max(0.5, prev + delta)))
  }

  const handleCropConfirm = useCallback(async () => {
    if (!pendingFile) return
    try {
      const img = new window.Image()
      img.src = cropImageUrl
      await new Promise((resolve) => {
        img.onload = resolve
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')

      const aspect = 2.2 / 1
      const imgAspect = img.width / img.height

      let sx: number, sy: number, sw: number, sh: number
      if (imgAspect > aspect) {
        sw = img.height * aspect
        sh = img.height
        sx = crop.x
        sy = crop.y
      } else {
        sw = img.width
        sh = img.width / aspect
        sx = crop.x
        sy = crop.y
      }
      const cropW = Math.min(sw, img.width - sx)
      const cropH = Math.min(sh, img.height - sy)

      canvas.width = cropW
      canvas.height = cropH

      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((cropRotation * Math.PI) / 180)
      ctx.translate(-canvas.width / 2, -canvas.height / 2)
      ctx.drawImage(
        img,
        sx,
        sy,
        cropW,
        cropH,
        0,
        0,
        canvas.width,
        canvas.height
      )
      ctx.restore()

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.85)
      )
      if (!blob) throw new Error('فشل استخراج الصورة المقصوصة')

      const croppedFile = new File(
        [blob],
        pendingFile.name.replace(/\.[^/.]+$/, '.jpg'),
        { type: 'image/jpeg' }
      )
      void uploadBanner(croppedFile).catch(() => {
        toast.error('فشل رفع الصورة الإعلانية')
      })

      setCropOpen(false)
      setCropImageUrl('')
      setPendingFile(null)
      setCropRotation(0)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    } catch (err) {
      toast.error('فشل معالجة الصورة')
      // eslint-disable-next-line no-console -- log crop errors for debugging
      console.error(err)
    }
  }, [cropImageUrl, cropRotation, crop.x, crop.y, pendingFile, uploadBanner])

  const handleUseOriginal = useCallback(() => {
    if (!pendingFile) return
    void uploadBanner(pendingFile).catch(() => {
      toast.error('فشل رفع الصورة الإعلانية')
    })
    setCropOpen(false)
    setCropImageUrl('')
    setPendingFile(null)
    setCropRotation(0)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }, [pendingFile, uploadBanner])

  /*--------------------- محرر رابط القائمة (Slug) ---------------------*/
  const [slugEditing, setSlugEditing] = useState(false)
  const [draftSlug, setDraftSlug] = useState(restaurantSlug ?? '')
  const [slugCopied, setSlugCopied] = useState(false)
  const checkSlug = useCheckSlugAvailability()
  const updateSlug = useUpdateRestaurantSlug()

  const activeSlug = slugEditing ? draftSlug : restaurantSlug || draftSlug
  const menuUrl = window.location.origin + '/menu/' + activeSlug

  const handleCopySlug = async () => {
    await navigator.clipboard.writeText(menuUrl)
    setSlugCopied(true)
    toast.success('تم نسخ الرابط.')
    setTimeout(() => setSlugCopied(false), 2000)
  }

  const handleOpenPreview = () => {
    window.open(menuUrl, '_blank')
  }

  const slugify = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

  const handleSaveSlug = async () => {
    const cleaned = slugify(draftSlug)
    if (!cleaned) {
      toast.error('الرجاء إدخال رابط صالح (أحرف، أرقام وشرطات فقط).')
      return
    }
    try {
      if (restaurantId) {
        const isAvailable = await checkSlug.mutateAsync({
          slug: cleaned,
          excludeRestaurantId: restaurantId,
        })
        if (!isAvailable) {
          toast.error('هذا الرابط مستخدم بالفعل، جرّب رابطاً آخر.')
          return
        }
      }
      await updateSlug.mutateAsync(cleaned)
      setDraftSlug(cleaned)
      setSlugEditing(false)
      toast.success('تم تحديث رابط القائمة.')
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'فشل تحديث الرابط، جرّب رابطاً آخر.'
      )
    }
  }

  /*--------------------------------------------------------------------*/

  return (
    <>
      <div
        className={cn(
          'flex flex-col items-center gap-3',
          embedded
            ? 'relative w-full'
            : 'fixed bottom-10 left-1/2 z-50 -translate-x-1/2'
        )}
      >
        {/* رابط القائمة (Slug) في أعلى الإعدادات */}
        {(linkOpen || embedded) && (
          <div
            className={cn(
              'flex w-full max-w-xs flex-col gap-2 rounded-2xl border border-white/10 bg-slate-800/90 p-3 shadow-2xl shadow-black/50 backdrop-blur-lg',
              slugEditing
                ? 'animate-in duration-200 fade-in slide-in-from-bottom-2'
                : ''
            )}
          >
            <div className='flex items-center justify-between px-2'>
              <span className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                رابط القائمة
              </span>
              <Button
                variant='ghost'
                size='icon'
                className='size-6 p-1'
                onClick={() => {
                  setSlugEditing(!slugEditing)
                  setLinkOpen(true)
                  setDraftSlug(restaurantSlug ?? '')
                }}
              >
                {slugEditing ? (
                  <X className='size-4 text-slate-400' />
                ) : (
                  <Link className='size-4 text-slate-400' />
                )}
              </Button>
            </div>

            <div className='flex flex-col gap-1.5 px-2'>
              <div className='flex items-center gap-2'>
                <span
                  dir='ltr'
                  className='shrink-0 font-mono text-[10px] text-slate-400'
                >
                  {window.location.origin}/menu/
                </span>
                {slugEditing ? (
                  <Input
                    value={draftSlug}
                    onChange={(e) => setDraftSlug(e.target.value)}
                    className='dir-ltr flex-1 border-slate-700 bg-slate-900/50 font-mono text-xs text-slate-100 placeholder-slate-500'
                    dir='ltr'
                    placeholder='my-restaurant'
                  />
                ) : (
                  <span
                    dir='ltr'
                    className='flex-1 truncate rounded border border-slate-700 bg-slate-900/50 px-2 py-1.5 font-mono text-xs text-slate-200'
                  >
                    {activeSlug}
                  </span>
                )}
              </div>
              <div className='flex gap-2 px-1'>
                <Button
                  size='icon'
                  variant='ghost'
                  disabled={slugEditing}
                  onClick={handleCopySlug}
                  title='نسخ الرابط'
                >
                  {slugCopied ? (
                    <Copy className='size-3 text-green-500' />
                  ) : (
                    <Copy className='size-3 text-slate-400' />
                  )}
                </Button>
                <Button
                  size='icon'
                  variant='ghost'
                  disabled={slugEditing}
                  onClick={handleOpenPreview}
                  title='فتح المعاينة'
                >
                  <ExternalLink className='size-3 text-slate-400' />
                </Button>
                {slugEditing ? (
                  <>
                    <Button
                      size='sm'
                      onClick={handleSaveSlug}
                      disabled={updateSlug.isPending}
                      className='bg-emerald-500 px-3 py-1.5 text-xs text-white hover:bg-emerald-400'
                    >
                      {updateSlug.isPending ? (
                        <>
                          <CloudUpload className='mr-1 size-3.5 animate-spin' />{' '}
                          حفظ...
                        </>
                      ) : (
                        <>
                          <Save className='mr-1 size-3.5' /> حفظ الرابط
                        </>
                      )}
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => {
                        setDraftSlug(restaurantSlug ?? '')
                        setSlugEditing(false)
                      }}
                      className='text-xs text-slate-400 hover:text-white'
                    >
                      إلغاء
                    </Button>
                  </>
                ) : (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setSlugEditing(true)}
                    className='border-slate-700 text-xs text-slate-400 hover:text-white'
                  >
                    <Pencil className='mr-1 size-3.5' /> تعديل
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* إعدادات العرض والهوية */}
        {styleOpen && (
          <div className='flex w-full max-w-xs animate-in flex-col gap-2 rounded-2xl border border-white/10 bg-slate-800/90 p-3 shadow-2xl shadow-black/50 backdrop-blur-lg duration-200 fade-in slide-in-from-bottom-2'>
            <div className='flex items-center justify-between px-2'>
              <span className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                الهية والعرض
              </span>
              <Button
                variant='ghost'
                size='icon'
                className='size-6 p-1'
                onClick={() => setStyleOpen(false)}
              >
                <Settings className='size-4 text-slate-400' />
              </Button>
            </div>

            {/* الهوية */}
            <div className='space-y-1.5'>
              <span className='ml-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                الهوية
              </span>

              <div className='space-y-1'>
                <Label className='text-[10px] text-slate-400'>اسم المطعم</Label>
                <Input
                  value={restaurantName ?? ''}
                  onChange={(e) => setRestaurantName(e.target.value || null)}
                  className='border-slate-700 bg-slate-900/50 text-xs text-slate-100 placeholder-slate-500'
                />
              </div>

              <div className='space-y-1'>
                <Label className='text-[10px] text-slate-400'>الوصف</Label>
                <Textarea
                  value={restaurantDescription ?? ''}
                  onChange={(e) =>
                    setRestaurantDescription(e.target.value || null)
                  }
                  rows={2}
                  className='border-slate-700 bg-slate-900/50 text-xs text-slate-100 placeholder-slate-500'
                />
              </div>

              <div className='space-y-1'>
                <Label className='flex items-center gap-2 text-[10px] text-slate-400'>
                  <ImageIcon className='size-3.5' /> الشعار
                </Label>
                <div className='flex items-center gap-2'>
                  {restaurantLogoUrl ? (
                    <img
                      src={restaurantLogoUrl}
                      alt='الشعار'
                      className='size-8 rounded-xl border border-white/10 object-cover'
                    />
                  ) : (
                    <div className='flex size-8 items-center justify-center rounded-xl border border-white/10 bg-slate-900/50 text-[10px] text-slate-500'>
                      شعار
                    </div>
                  )}
                  <label className='cursor-pointer'>
                    <input
                      ref={logoInputRef}
                      type='file'
                      accept='image/*'
                      className='sr-only'
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file || !restaurantId) return
                        void uploadMenuImage(restaurantId, 'branding', file)
                          .then(async (path) => {
                            const { error } = await supabase
                              .from('restaurant_branding')
                              .upsert({ restaurant_id: restaurantId, logo_path: path }, { onConflict: 'restaurant_id' })
                            if (error) throw error
                            const url = getMenuImageUrl(path)
                            setRestaurantLogoUrl(url)
                            toast.success('تم تغيير الشعار وحفظه.')
                          })
                          .catch(() => toast.error('فشل رفع الشعار'))
                        e.target.value = ''
                      }}
                    />
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => logoInputRef.current?.click()}
                      className='rounded border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:text-white'
                    >
                      رفع
                    </Button>
                  </label>
                </div>
              </div>

              <div className='space-y-1'>
                <Label className='flex items-center gap-2 text-[10px] text-slate-400'>
                  <Phone className='size-3.5' /> خدمة العملاء (واتساب)
                </Label>
                <Input
                  value={wazeUrl ?? ''}
                  onChange={(e) => setWazeUrl(e.target.value || null)}
                  placeholder='رقم واتساب أو رابط'
                  className='border-slate-700 bg-slate-900/50 text-xs text-slate-100 placeholder-slate-500'
                />
              </div>

              <div className='space-y-1'>
                <Label className='flex items-center gap-2 text-[10px] text-slate-400'>
                  <MapPin className='size-3.5' /> جوجل مابس / Waze
                </Label>
                <Input
                  value={googleMapsUrl ?? ''}
                  onChange={(e) => setGoogleMapsUrl(e.target.value || null)}
                  placeholder='رابط موقع المطعم'
                  className='border-slate-700 bg-slate-900/50 text-xs text-slate-100 placeholder-slate-500'
                />
              </div>

              <div className='flex items-center gap-2'>
                <Switch checked={style.isOpen} onCheckedChange={setIsOpen} />
                <span className='text-xs text-slate-300'>
                  {style.isOpen ? 'المطعم مفتوح' : 'المطعم مغلق'}
                </span>
              </div>
            </div>

            <div className='space-y-2 rounded-xl border border-white/8 bg-slate-950/25 p-2'>
              <span className='block text-[10px] font-bold tracking-wider text-slate-400 uppercase'>ألوان المنيو</span>
              <p className='text-[10px] leading-4 text-slate-500'>{templateLocked ? 'هذا قالب أساسي ثابت: اللون والشكل محميان.' : 'عدّل ألوان القالب من دون تغيير تصميمه أو ترتيب عناصره.'}</p>
              <div className='grid grid-cols-2 gap-2'>
                <label className='space-y-1 text-[10px] text-slate-400'>
                  اللون الأول
                  <input disabled={templateLocked} type='color' value={style.accentColor} onChange={(event) => setMenuStyle({ accentColor: event.target.value })} className='block h-8 w-full cursor-pointer rounded border-0 bg-transparent disabled:cursor-not-allowed disabled:opacity-40' />
                </label>
                <label className='space-y-1 text-[10px] text-slate-400'>
                  اللون الثاني
                  <input disabled={templateLocked} type='color' value={style.secondaryColor} onChange={(event) => setMenuStyle({ secondaryColor: event.target.value })} className='block h-8 w-full cursor-pointer rounded border-0 bg-transparent disabled:cursor-not-allowed disabled:opacity-40' />
                </label>
              </div>
              <label className='block text-[10px] text-slate-400'>
                اتجاه الدمج
                <input disabled={templateLocked} type='range' min='0' max='360' value={style.gradientAngle} onChange={(event) => setMenuStyle({ gradientAngle: Number(event.target.value) })} className='mt-1 w-full accent-emerald-400 disabled:opacity-40' />
              </label>
              <div className='h-8 rounded-lg' style={{ background: 'linear-gradient(' + style.gradientAngle + 'deg, ' + style.accentColor + ', ' + style.secondaryColor + ')' }} />
              <label className='block text-[10px] text-slate-400'>
                لون خلفية المنيو
                <input disabled={templateLocked} type='color' value={style.backgroundColor} onChange={(event) => setMenuStyle({ backgroundColor: event.target.value })} className='mt-1 block h-8 w-full cursor-pointer rounded border-0 bg-transparent disabled:cursor-not-allowed disabled:opacity-40' />
              </label>
              <Button type='button' size='sm' variant='outline' onClick={restoreOriginalStyle} className='w-full text-[10px]'>
                استرجاع التصميم المحفوظ سابقًا
              </Button>
            </div>

            <div className='space-y-2 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-2'>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-bold text-cyan-200'>خط النيون الانتقالي</span>
                <Switch checked={style.neonLineEnabled} onCheckedChange={(checked) => setMenuStyle({ neonLineEnabled: checked })} />
              </div>
              <p className='text-[10px] leading-4 text-slate-500'>خط متحرك ناعم ينتقل بين اللونين اللذين اخترتهما.</p>
              {style.neonLineEnabled && <p className='text-[10px] text-cyan-200/70'>يظهر تلقائيًا أعلى وأسفل المنيو بالكامل.</p>}
            </div>

            <div className='space-y-2 rounded-xl border border-white/8 bg-slate-950/25 p-2'>
              <span className='block text-[10px] font-bold tracking-wider text-slate-400 uppercase'>التواصل الاجتماعي</span>
              {(['whatsapp', 'instagram', 'facebook', 'tiktok'] as const).map((network) => (
                <div key={network} className='grid grid-cols-[1fr_auto] items-center gap-2'>
                  <Input
                    value={style.socialLinks[network]}
                    onChange={(event) => setMenuStyle({ socialLinks: { ...style.socialLinks, [network]: event.target.value } })}
                    placeholder={network === 'whatsapp' ? 'رابط أو رقم واتساب' : network + '.com/...'}
                    className='h-8 border-slate-700 bg-slate-900/50 text-[10px] text-slate-100'
                  />
                  <Switch checked={style.socialVisibility[network]} onCheckedChange={(checked) => setMenuStyle({ socialVisibility: { ...style.socialVisibility, [network]: checked } })} />
                </div>
              ))}
            </div>

            <div className='space-y-2 rounded-xl border border-orange-300/15 bg-orange-300/5 p-2'>
              <div className='flex items-center justify-between'>
                <span className='text-[10px] font-bold text-orange-200'>إعلان عند دخول المنيو</span>
                <Switch checked={style.entryAdEnabled} onCheckedChange={(checked) => setMenuStyle({ entryAdEnabled: checked })} />
              </div>
              <Input value={style.entryAdTitle} onChange={(event) => setMenuStyle({ entryAdTitle: event.target.value })} placeholder='عنوان الإعلان' className='h-8 border-slate-700 bg-slate-900/50 text-[10px] text-slate-100' />
              <Textarea value={style.entryAdMessage} onChange={(event) => setMenuStyle({ entryAdMessage: event.target.value })} placeholder='وصف أو عرض الإعلان' rows={2} className='border-slate-700 bg-slate-900/50 text-[10px] text-slate-100' />
              <input ref={adInputRef} type='file' accept='image/*' className='sr-only' onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                void uploadBanner(file).then((urls) => setMenuStyle({ entryAdImageUrl: urls[urls.length - 1] ?? null })).catch(() => toast.error('فشل رفع صورة الإعلان'))
                event.target.value = ''
              }} />
              <Button type='button' size='sm' variant='outline' onClick={() => adInputRef.current?.click()} className='w-full text-[10px]'>
                <ImageIcon className='mr-1 size-3.5' /> {style.entryAdImageUrl ? 'تغيير صورة الإعلان' : 'رفع صورة الإعلان'}
              </Button>
              {style.entryAdImageUrl && <img src={style.entryAdImageUrl} alt='معاينة الإعلان' className='h-20 w-full rounded-lg object-cover' />}
            </div>

            {/* اللوحة الإعلانية - رفع صور (حتى 3) */}
            <div className='space-y-1.5'>
              <span className='ml-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
                اللوحة الإعلانية
              </span>
              <label className='block cursor-pointer'>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  className='sr-only'
                  onChange={handleBannerFileChange}
                />
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => fileInputRef.current?.click()}
                  className='w-full text-xs whitespace-normal'
                  disabled={style.bannerUrls.length >= 3}
                >
                  {style.bannerUrls.length >= 3 ? (
                    <>
                      <ImageIcon className='mr-1.5 size-3.5' /> تم بلوغ الحد
                      الأقصى (3 صور)
                    </>
                  ) : (
                    <>
                      <ImageIcon className='mr-1.5 size-3.5' /> رفع صورة إعلانية
                    </>
                  )}
                </Button>
              </label>
              {style.bannerUrls.length > 0 && (
                <div className='flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded border border-white/5 bg-slate-900/50 px-1 py-1'>
                  {style.bannerUrls.map((url) => (
                    <div
                      key={url}
                      className='relative flex-shrink-0 overflow-hidden rounded border border-white/10'
                    >
                      <img
                        src={url}
                        alt='إعلان'
                        className='h-12 w-16 object-cover object-center'
                      />
                      <Button
                        variant='ghost'
                        size='icon'
                        className='absolute -top-1 -right-1 size-6 bg-red-500/90 p-0.5 text-white hover:bg-red-600'
                        onClick={() => removeBannerUrl(url)}
                      >
                        <X className='size-3' />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          className={cn(
            'flex gap-2 border border-white/10 bg-slate-800/80 p-2 shadow-2xl shadow-black/50 backdrop-blur-lg',
            embedded
              ? 'w-full flex-wrap rounded-2xl'
              : 'items-center rounded-full'
          )}
        >
          <Button
            variant='outline'
            size='sm'
            onClick={addCategory}
            className={cn('border-white/10 whitespace-nowrap text-slate-200 hover:bg-white/10 hover:text-white', embedded && 'flex-1')}
          >
            <Plus className='mr-1.5 size-4' /> إضافة قسم
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setLinkOpen((open) => !open)}
            className={cn('border-white/10 whitespace-nowrap text-slate-200 hover:bg-white/10 hover:text-white', embedded && 'flex-1')}
          >
            <Link className='mr-1.5 size-4' /> الرابط
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              const first = categories.find((c) => !c._isDeleted)
              if (first) addItem(first.id)
            }}
            disabled={!categories.find((c) => !c._isDeleted)}
            className={cn('border-white/10 whitespace-nowrap text-slate-200 hover:bg-white/10 hover:text-white', embedded && 'flex-1')}
          >
            <Plus className='mr-1.5 size-4' /> إضافة وجبة
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setStyleOpen(!styleOpen)}
            className={cn('border-white/10 whitespace-nowrap text-slate-200 hover:bg-white/10 hover:text-white', embedded && 'flex-1')}
          >
            <Settings className='mr-1.5 size-4' /> إعدادات
          </Button>
          <Button
            onClick={publish}
            disabled={isPublishing}
            className={cn(
              'bg-emerald-500 px-4 py-1.5 text-sm font-medium whitespace-nowrap text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400',
              embedded && 'w-full'
            )}
          >
            {isPublishing ? (
              <>
                <CloudUpload className='mr-1.5 size-4 animate-spin' /> نشر...
              </>
            ) : publishStatus === 'success' ? (
              <>
                <Save className='mr-1.5 size-4' /> نُشر
              </>
            ) : (
              <>
                <Save className='mr-1.5 size-4' /> حفظ ونشر المنيو
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Croper Modal */}
      {cropOpen && pendingFile && (
        <div
          className='fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm'
          onClick={handleCropCancel}
        >
          <div
            className='relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='mb-3 flex items-center justify-between'>
              <span className='text-xs font-bold text-slate-300 uppercase'>
                قص الصورة الإعلانية (2:1)
              </span>
              <div className='flex gap-1'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setCropRotation((r) => (r + 90) % 360)}
                >
                  <RotateCcw className='size-4' />
                </Button>
                <Button variant='ghost' size='icon' onClick={handleCropCancel}>
                  <X className='size-4' />
                </Button>
              </div>
            </div>

            <div
              className='relative mx-auto mb-4 h-[360px] w-full touch-none overflow-hidden rounded-xl border border-white/20 bg-slate-800 select-none'
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              style={{ maxHeight: '60vh' }}
            >
              <img
                src={cropImageUrl}
                alt='قص'
                className='h-full w-full object-contain'
                style={{
                  transform: `rotate(${cropRotation}deg) scale(${zoom})`,
                  transformOrigin: `${50 + crop.x / 2}% ${50 + crop.y / 2}%`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
              />
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between text-xs text-slate-400'>
                <span>التقريب (Zoom)</span>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 p-0'
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                  >
                    <X className='size-3' />
                  </Button>
                  <span className='w-8 text-center'>
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 p-0'
                    onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                  >
                    <Maximize className='size-3' />
                  </Button>
                </div>
              </div>

              <input
                type='range'
                min='0.5'
                max='3'
                step='0.1'
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className='h-1 w-48 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-emerald-500'
              />

              <div className='flex justify-between pt-3'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleUseOriginal}
                  className='w-40 border-slate-700 text-slate-300'
                >
                  استخدام بدون قص
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleCropCancel}
                  className='w-40 border-slate-700 text-slate-400'
                >
                  إلغاء
                </Button>
                <Button
                  variant='default'
                  size='sm'
                  onClick={handleCropConfirm}
                  className='w-40 bg-emerald-500 text-white hover:bg-emerald-400'
                >
                  تأكيد القص
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
