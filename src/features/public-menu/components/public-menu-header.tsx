import { ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMenuImageUrl } from '@/lib/supabase'
import type { MenuTemplate } from '../templates/types'
import type { PublicBranding, PublicRestaurant } from '../api'

interface PublicMenuHeaderProps {
  restaurant: PublicRestaurant
  branding: PublicBranding | null
  template: MenuTemplate
  primaryColor: string
  cartCount: number
  onCartToggle: () => void
}

export function PublicMenuHeader({
  restaurant,
  branding,
  template,
  primaryColor,
  cartCount,
  onCartToggle,
}: PublicMenuHeaderProps) {
  const logoUrl = getMenuImageUrl(branding?.logo_path)
  const restaurantName = restaurant.name_ar ?? restaurant.name

  // منيمال: بدون شريط ملوّن، اسم المطعم فقط أعلى الصفحة بخط كبير
  if (template.headerStyle === 'minimal') {
    return (
      <div className='flex items-center justify-between gap-3 px-4 pt-6 pb-3'>
        <div className='flex items-center gap-3'>
          {logoUrl && (
            <img src={logoUrl} alt={restaurantName} className='size-10 rounded-full object-cover' />
          )}
          <h1 className='text-xl font-bold'>{restaurantName}</h1>
        </div>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='text-white border-white/40 hover:bg-white/30'
          onClick={onCartToggle}
        >
          <ShoppingCart className='size-4 mr-1' />
          سلة ({cartCount})
        </Button>
      </div>
    )
  }

  // ممركز: شعار كبير في المنتصف، بروح القوائم الراقية التقليدية
  if (template.headerStyle === 'centered') {
    return (
      <div className='flex flex-col items-center gap-2 px-4 pb-5 pt-8 text-center'>
        {logoUrl ? (
          <img src={logoUrl} alt={restaurantName} className='size-16 rounded-full border object-cover' />
        ) : (
          <div
            className='flex size-16 items-center justify-center rounded-full border-2'
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <UtensilsCrossed className='size-7' />
          </div>
        )}
        <h1 className='text-2xl font-bold'>{restaurantName}</h1>
        {template.ornamented && (
          <div className='mt-1 flex items-center gap-2 text-xs' style={{ color: primaryColor }}>
            <span className='h-px w-8' style={{ backgroundColor: primaryColor }} />
            منيو
            <span className='h-px w-8' style={{ backgroundColor: primaryColor }} />
          </div>
        )}
        <div className='mt-4 flex justify-center'>
          <Button type='button' size='sm' variant='outline' className='text-white border-white/40 hover:bg-white/30' onClick={onCartToggle}>
            <ShoppingCart className='size-4 mr-1' />
            سلة ({cartCount})
          </Button>
        </div>
      </div>
    )
  }

  // تقسيم: اسم المطعم يسار، شعار دائري يمين، بدون خلفية ملوّنة
  if (template.headerStyle === 'split') {
    return (
      <div className='flex items-center justify-between border-b px-4 py-4'>
        <h1 className='text-xl font-bold'>{restaurantName}</h1>
        <div className='flex items-center gap-2'>
          {logoUrl ? (
            <img src={logoUrl} alt={restaurantName} className='size-11 rounded-full object-cover' />
          ) : (
            <div
              className='flex size-11 items-center justify-center rounded-full'
              style={{ backgroundColor: primaryColor, color: '#fff' }}
            >
              <UtensilsCrossed className='size-5' />
            </div>
          )}
          <Button type='button' size='sm' variant='outline' className='text-white border-white/40 hover:bg-white/30' onClick={onCartToggle}>
            <ShoppingCart className='size-4 mr-1' />
            سلة ({cartCount})
          </Button>
        </div>
      </div>
    )
  }

  // غطاء (Cover): خلفية داكنة متدرجة بارتفاع أكبر، للقوالب الفاخرة والزجاجية
  if (template.headerStyle === 'cover') {
    return (
      <div
        className='flex flex-col items-center justify-center gap-3 px-4 py-10 text-center'
        style={{
          background: `radial-gradient(circle at 50% 0%, color-mix(in oklab, ${primaryColor} 45%, transparent), transparent 70%)`,
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={restaurantName}
            className='size-16 rounded-full border object-cover'
            style={{ borderColor: template.previewAccent }}
          />
        ) : (
          <div
            className='flex size-16 items-center justify-center rounded-full border'
            style={{ borderColor: template.previewAccent, color: template.previewAccent }}
          >
            <UtensilsCrossed className='size-7' />
          </div>
        )}
        <h1 className='text-2xl font-bold tracking-wide'>{restaurantName}</h1>
        <div className='mt-4 flex justify-center'>
          <Button type='button' size='sm' variant='outline' className='text-white border-white/40 hover:bg-white/30' onClick={onCartToggle}>
            <ShoppingCart className='size-4 mr-1' />
            سلة ({cartCount})
          </Button>
        </div>
      </div>
    )
  }

  // البانر الافتراضي: شريط ملوّن بلون المطعم الأساسي
  return (
    <div className='flex items-center justify-between border-b px-4 py-4' style={{ backgroundColor: primaryColor }}>
      <div className='flex items-center gap-3'>
        {logoUrl ? (
          <img src={logoUrl} alt={restaurantName} className='size-12 rounded-full border-2 border-white/40 object-cover' />
        ) : (
          <div className='flex size-12 items-center justify-center rounded-full bg-white/20 text-white'>
            <UtensilsCrossed className='size-6' />
          </div>
        )}
        <div>
          <h1 className='text-lg font-bold text-white'>{restaurantName}</h1>
          <p className='text-xs text-white/80'>امسح، تصفح، واطلب</p>
        </div>
      </div>
      <Button
        type='button'
        size='sm'
        variant='outline'
        className='text-white border-white/40 hover:bg-white/20'
        onClick={onCartToggle}
      >
        <ShoppingCart className='size-4 mr-1' />
        سلة ({cartCount})
      </Button>
    </div>
  )
}
