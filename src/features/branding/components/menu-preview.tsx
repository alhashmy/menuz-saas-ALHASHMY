import { UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMenuTemplate } from '@/features/public-menu/templates/registry'

interface MenuPreviewProps {
  restaurantName: string
  primaryColor: string
  accentColor: string
  themeModeOverride?: 'light' | 'dark' | 'system'
  templateId: string
  logoUrl: string | null
}

const sampleItems = [
  { name: 'برجر لحم مشوي', price: '35' },
  { name: 'بيتزا مارغريتا', price: '28' },
  { name: 'عصير برتقال طازج', price: '12' },
  { name: 'سلطة سيزر', price: '22' },
]

export function MenuPreview({
  restaurantName,
  primaryColor,
  accentColor,
  themeModeOverride,
  templateId,
  logoUrl,
}: MenuPreviewProps) {
  const template = getMenuTemplate(templateId)
  const isDark = template.forceDark
    ? true
    : template.forceLight
      ? false
      : (themeModeOverride ?? 'dark') !== 'light'

  const animClass =
    template.animation === 'shimmer-gold'
      ? 'menu-anim-shimmer-gold'
      : template.animation === 'glow-pulse'
        ? 'menu-anim-glow-pulse'
        : ''

  return (
    <div
      dir='rtl'
      className={cn('overflow-hidden rounded-xl border shadow-sm', isDark && 'dark')}
      style={{
        backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
        fontFamily: template.fontFamily,
        ['--menu-accent' as string]: accentColor,
      }}
    >
      {/* Header */}
      {template.headerStyle === 'minimal' ? (
        <div className='flex items-center gap-2 px-4 pt-5 pb-2'>
          {logoUrl && <img src={logoUrl} alt='' className='size-8 rounded-full object-cover' />}
          <span className={cn('font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
            {restaurantName || 'اسم المطعم'}
          </span>
        </div>
      ) : template.headerStyle === 'centered' || template.headerStyle === 'cover' ? (
        <div
          className='flex flex-col items-center gap-2 px-4 py-6 text-center'
          style={
            template.headerStyle === 'cover'
              ? { background: `radial-gradient(circle at 50% 0%, ${primaryColor}55, transparent 70%)` }
              : undefined
          }
        >
          {logoUrl ? (
            <img src={logoUrl} alt='' className='size-10 rounded-full border object-cover' />
          ) : (
            <div
              className='flex size-10 items-center justify-center rounded-full border-2'
              style={{ borderColor: template.headerStyle === 'cover' ? accentColor : primaryColor }}
            >
              <UtensilsCrossed className='size-4' />
            </div>
          )}
          <span className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
            {restaurantName || 'اسم المطعم'}
          </span>
        </div>
      ) : template.headerStyle === 'split' ? (
        <div className='flex items-center justify-between px-4 py-4'>
          <span className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-zinc-900')}>
            {restaurantName || 'اسم المطعم'}
          </span>
          <div
            className='flex size-8 items-center justify-center rounded-full text-white'
            style={{ backgroundColor: primaryColor }}
          >
            <UtensilsCrossed className='size-4' />
          </div>
        </div>
      ) : (
        <div className='flex items-center gap-3 px-4 py-4' style={{ backgroundColor: primaryColor }}>
          {logoUrl ? (
            <img src={logoUrl} alt='' className='size-9 rounded-full border-2 border-white/40 object-cover' />
          ) : (
            <div className='flex size-9 items-center justify-center rounded-full bg-white/20 text-white'>
              <UtensilsCrossed className='size-4' />
            </div>
          )}
          <span className='text-sm font-bold text-white'>{restaurantName || 'اسم المطعم'}</span>
        </div>
      )}

      {/* Tabs */}
      <div className='flex gap-2 overflow-x-auto px-4 py-2.5' style={{ backgroundColor: isDark ? '#141414' : '#f4f4f5' }}>
        {['الكل', 'المقبلات', 'المشروبات'].map((tab, i) => (
          <span
            key={tab}
            className='shrink-0 rounded-full px-3 py-1 text-[11px] font-medium'
            style={
              i === 0
                ? { backgroundColor: accentColor, color: '#fff' }
                : { color: isDark ? '#a1a1aa' : '#52525b' }
            }
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Items */}
      <div
        className={cn(
          'p-3',
          template.cardLayout === 'grid' || template.cardLayout === 'overlay'
            ? 'grid grid-cols-2 gap-2.5'
            : 'flex flex-col gap-2.5'
        )}
      >
        {sampleItems.slice(0, template.cardLayout === 'grid' || template.cardLayout === 'overlay' ? 4 : 2).map((item) => (
          <div
            key={item.name}
            className={cn('overflow-hidden rounded-lg border', animClass)}
            style={{ backgroundColor: isDark ? '#1c1c1c' : '#fafafa', borderColor: isDark ? '#2a2a2a' : '#e4e4e7' }}
          >
            <div className='h-12' style={{ backgroundColor: isDark ? '#262626' : '#e4e4e7' }} />
            <div className='p-2'>
              <p className={cn('truncate text-xs font-medium', isDark ? 'text-white' : 'text-zinc-900')}>
                {item.name}
              </p>
              <p className='text-[11px] font-semibold' style={{ color: accentColor }}>
                {item.price} د.ع
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
