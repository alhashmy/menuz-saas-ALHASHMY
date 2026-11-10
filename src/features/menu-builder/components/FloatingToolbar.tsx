'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Plus,
  Save,
  CloudUpload,
  LayoutList,
  LayoutGrid,
  Palette,
  Settings,
  X,
  Image as ImageIcon,
  Maximize,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useMenuBuilderStore } from '../store'
import type { MenuLayout } from '../types'

const LAYOUTS: { id: MenuLayout; label: string; icon: React.ElementType }[] = [
  { id: 'list', label: 'قائمة', icon: LayoutList },
  { id: 'grid-2', label: 'ثنائي', icon: LayoutGrid },
  { id: 'grid-3', label: 'ثلاثي', icon: LayoutGrid },
  { id: 'cards', label: 'كروت', icon: LayoutGrid },
]

export function FloatingToolbar() {
  const {
    addCategory,
    publish,
    isPublishing,
    publishStatus,
    addItem,
    setMenuStyle,
    style,
    removeBannerUrl,
    uploadBanner,
    setBackgroundColor,
  } = useMenuBuilderStore()
  const { categories } = useMenuBuilderStore()

  const [styleOpen, setStyleOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* Croper modal state */
  const [cropOpen, setCropOpen] = useState(false)
  const [cropImageUrl, setCropImageUrl] = useState('')
  const [cropRotation, setCropRotation] = useState(0)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 })

  const setLayout = (layout: MenuLayout) => setMenuStyle({ layout })
  const setNeonEnabled = (enabled: boolean) => setMenuStyle({ neonEnabled: enabled })
  const setNeonColor = (color: string) => setMenuStyle({ neonColor: color })
  const setBgColor = (color: string) => setBackgroundColor(color)

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
      ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height)
      ctx.restore()

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.85)
      )
      if (!blob) throw new Error('فشل استخراج الصورة المقصوصة')

      const croppedFile = new File([blob], pendingFile.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' })
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

  return (
    <>
      <div className='fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2'>
      {/* أنماط العرض */}
      {styleOpen && (
        <div className='flex flex-col gap-2 rounded-2xl bg-slate-800/90 backdrop-blur-lg border border-white/10 p-3 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-bottom-2 duration-200'>
          <div className='flex items-center justify-between px-2'>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>أنماط العرض</span>
            <Button
              variant='ghost'
              size='icon'
              className='size-6 p-1'
              onClick={() => setStyleOpen(false)}
            >
              <Settings className='size-4 text-slate-400' />
            </Button>
          </div>

          {/* التخطيط */}
          <div className='space-y-1.5'>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1'>التخطيط</span>
            <div className='flex gap-1'>
              {LAYOUTS.map((l) => (
                <Button
                  key={l.id}
                  variant={style.layout === l.id ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setLayout(l.id)}
                  className={cn(
                    'whitespace-nowrap text-xs px-2 py-1',
                    style.layout === l.id
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30'
                      : 'text-slate-300 border-slate-700 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <l.icon className='size-3 mr-1' /> {l.label}
                </Button>
              ))}
            </div>
          </div>

          {/* لون الت diferenci */}
          <div className='space-y-1.5'>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1'>اللون الأساسي</span>
            <div className='flex items-center gap-2'>
              <input
                type='color'
                value={style.accentColor}
                onChange={(e) => setMenuStyle({ accentColor: e.target.value })}
                className='h-8 w-8 rounded-full border-none bg-transparent cursor-pointer'
                title='اختر لوناً مخصصاً'
              />
              <span className='text-xs text-slate-400'>{style.accentColor}</span>
            </div>
          </div>

          {/* اللوحة الإعلانية - رفع صور (حتى 3) */}
          <div className='space-y-1.5'>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1'>اللوحة الإعلانية</span>
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
                className='w-full whitespace-normal text-xs'
                disabled={style.bannerUrls.length >= 3}
              >
                {style.bannerUrls.length >= 3 ? (
                  <>
                    <ImageIcon className='size-3.5 mr-1.5' /> تم بلوغ الحد الأقصى (3 صور)
                  </>
                ) : (
                  <>
                    <ImageIcon className='size-3.5 mr-1.5' /> رفع صورة إعلانية
                  </>
                )}
              </Button>
            </label>
            {style.bannerUrls.length > 0 && (
              <div className='flex flex-wrap gap-1.5 max-h-24 overflow-y-auto px-1 py-1 bg-slate-900/50 rounded border border-white/5'>
                {style.bannerUrls.map((url) => (
                  <div
                    key={url}
                    className='relative flex-shrink-0 rounded overflow-hidden border border-white/10'
                  >
                    <img
                      src={url}
                      alt='إعلان'
                      className='w-16 h-12 object-cover object-center'
                    />
                    <Button
                      variant='ghost'
                      size='icon'
                      className='absolute -right-1 -top-1 size-6 p-0.5 bg-red-500/90 hover:bg-red-600 text-white'
                      onClick={() => removeBannerUrl(url)}
                    >
                      <X className='size-3' />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

            {/* تأثيرات السايبر/النيون */}
            <div className='space-y-1.5'>
              <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1'>تأثيرات النيون</span>
              <div className='flex items-center gap-2 px-1'>
                <Switch
                  checked={style.neonEnabled}
                  onCheckedChange={setNeonEnabled}
                />
                <span className='text-xs text-slate-300'>تفعيل النيون</span>
              </div>

              {/* لون إطار النيون */}
              {style.neonEnabled && (
                <div className='space-y-1'>
                  <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1'>لون إطار النيون</span>
                  <input
                    type='color'
                    value={style.neonColor}
                    onChange={(e) => setNeonColor(e.target.value)}
                    className='h-8 w-8 rounded-full border-none bg-transparent cursor-pointer'
                    title='اختر لون إطار النيون'
                  />
                  <span className='text-xs text-slate-400'>{style.neonColor}</span>
                </div>
              )}
            </div>

            {/* لون الخلفية */}
            <div className='space-y-1.5'>
              <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1'>لون الخلفية</span>
              <input
                type='color'
                value={style.backgroundColor}
                onChange={(e) => setBgColor(e.target.value)}
                className='h-8 w-8 rounded-full border-none bg-transparent cursor-pointer'
                title='اختر لون خلفية المنيو'
              />
              <span className='text-xs text-slate-400'>{style.backgroundColor}</span>
            </div>
          </div>
        )}

      <div className='flex items-center gap-3 rounded-full bg-slate-800/80 backdrop-blur-lg border border-white/10 p-2 shadow-2xl shadow-black/50'>
        <Button
          variant='outline'
          size='sm'
          onClick={addCategory}
          className='whitespace-nowrap text-slate-200 hover:text-white hover:bg-white/10 border-white/10'
        >
          <Plus className='size-4 mr-1.5' /> إضافة قسم
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            const first = categories.find((c) => !c._isDeleted)
            if (first) addItem(first.id)
          }}
          disabled={!categories.find((c) => !c._isDeleted)}
          className='whitespace-nowrap text-slate-200 hover:text-white hover:bg-white/10 border-white/10'
        >
          <Plus className='size-4 mr-1.5' /> إضافة وجبة
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setStyleOpen(!styleOpen)}
          className='whitespace-nowrap text-slate-200 hover:text-white hover:bg-white/10 border-white/10'
        >
          <Palette className='size-4 mr-1.5' /> أنماط
        </Button>
        <Button
          onClick={publish}
          disabled={isPublishing}
          className='bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 whitespace-nowrap px-4 py-1.5 text-sm font-medium transition-all'
        >
          {isPublishing ? (
            <>
              <CloudUpload className='size-4 mr-1.5 animate-spin' /> نشر...
            </>
          ) : publishStatus === 'success' ? (
            <>
              <Save className='size-4 mr-1.5' /> نُشر
            </>
          ) : (
            <>
              <Save className='size-4 mr-1.5' /> حفظ ونشر المنيو
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
          className='relative bg-slate-900 rounded-2xl p-4 w-full max-w-2xl max-h-[90vh] overflow-auto border border-white/10 shadow-2xl'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='flex items-center justify-between mb-3'>
            <span className='text-xs font-bold text-slate-300 uppercase'>قص الصورة الإعلانية (2:1)</span>
            <div className='flex gap-1'>
              <Button variant='ghost' size='icon' onClick={() => setCropRotation((r) => (r + 90) % 360)}>
                <RotateCcw className='size-4' />
              </Button>
              <Button variant='ghost' size='icon' onClick={handleCropCancel}>
                <X className='size-4' />
              </Button>
            </div>
          </div>

          {/* Preview container with fixed aspect ratio */}
          <div
            className='relative w-full h-[360px] overflow-hidden select-none touch-none bg-slate-800 rounded-xl border border-white/20 mx-auto mb-4'
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
              className='w-full h-full object-contain'
              style={{
                transform: `rotate(${cropRotation}deg) scale(${zoom})`,
                transformOrigin: `${50 + crop.x / 2}% ${50 + crop.y / 2}%`,
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
            />
          </div>

          {/* Controls */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-xs text-slate-400'>
              <span>التقريب (Zoom)</span>
              <div className='flex items-center gap-2'>
                <Button variant='ghost' size='icon' className='h-6 w-6 p-0' onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
                  <X className='size-3' />
                </Button>
                <span className='w-8 text-center'>{Math.round(zoom * 100)}%</span>
                <Button variant='ghost' size='icon' className='h-6 w-6 p-0' onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>
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
              className='w-48 accent-emerald-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer'
            />

            <div className='flex justify-between pt-3'>
              <Button variant='outline' size='sm' onClick={handleUseOriginal} className='w-40 text-slate-300 border-slate-700'>
                استخدام بدون قص
              </Button>
              <Button variant='outline' size='sm' onClick={handleCropCancel} className='w-40 text-slate-400 border-slate-700'>
                إلغاء
              </Button>
              <Button variant='default' size='sm' onClick={handleCropConfirm} className='w-40 bg-emerald-500 text-white hover:bg-emerald-400'>
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
