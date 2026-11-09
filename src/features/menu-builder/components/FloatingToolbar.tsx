'use client'

import { useState } from 'react'
import { Plus, Save, CloudUpload, LayoutList, LayoutGrid, Zap, Palette, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { useMenuBuilderStore } from '../store'
import type { MenuLayout, NeonPlacement } from '../types'

const LAYOUTS: { id: MenuLayout; label: string; icon: React.ElementType }[] = [
  { id: 'list', label: 'قائمة', icon: LayoutList },
  { id: 'grid-2', label: 'ثنائي', icon: LayoutGrid },
  { id: 'grid-3', label: 'ثلاثي', icon: LayoutGrid },
  { id: 'cards', label: 'كروت', icon: LayoutGrid },
]

const NEON_PLACEMENTS: { id: NeonPlacement; label: string }[] = [
  { id: 'cards', label: 'بطاقات الوجبات' },
  { id: 'strips', label: 'أشرطة تفصيلية' },
  { id: 'all', label: 'الكل' },
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
  } = useMenuBuilderStore()
  const { categories } = useMenuBuilderStore()

  const [styleOpen, setStyleOpen] = useState(false)

  const setLayout = (layout: MenuLayout) => setMenuStyle({ layout })
  const setNeonEnabled = (enabled: boolean) => setMenuStyle({ neonEnabled: enabled })
  const setNeonPlacement = (placement: NeonPlacement) => setMenuStyle({ neonPlacement: placement })
  const setBannerUrl = (url: string) => setMenuStyle({ bannerUrl: url || null })

  return (
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

          {/* رابط اللوحة الإعلانية (بانر) */}
          <div className='space-y-1.5'>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1'>اللوحة الإعلانية</span>
            <div className='relative'>
              <Input
                value={style.bannerUrl ?? ''}
                placeholder='https://example.com/banner.jpg'
                onChange={(e) => setBannerUrl(e.target.value)}
                className='text-xs bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500'
              />
              <Button
                variant='ghost'
                size='icon'
                className='absolute right-1 top-1 size-6'
                onClick={() => setBannerUrl('')}
              >
                <X className='size-4 text-slate-400' />
              </Button>
            </div>
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
            {style.neonEnabled && (
              <div className='flex gap-1'>
                {NEON_PLACEMENTS.filter((p) => p.id !== null).map((p) => (
                  <Button
                    key={p.id}
                    variant={style.neonPlacement === p.id ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setNeonPlacement(p.id)}
                    className={cn(
                      'whitespace-nowrap text-xs px-2 py-1',
                      style.neonPlacement === p.id
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30'
                        : 'text-slate-300 border-slate-700 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Zap className='size-3 mr-1' /> {p.label}
                  </Button>
                ))}
              </div>
            )}
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
  )
}
