import { cn } from '@/lib/utils'
import { getMenuImageUrl } from '@/lib/supabase'
import { UtensilsCrossed } from 'lucide-react'
import type { PublicMenuCategory } from '../api'
import type { MenuTemplate } from '../templates/types'

interface CategoryTabsBarProps {
  categories: PublicMenuCategory[]
  activeId: string
  accentColor: string
  template: MenuTemplate
  isLight: boolean
  onSelect: (id: string) => void
  className?: string
}

export function CategoryTabsBar({
  categories,
  activeId,
  accentColor,
  template,
  isLight,
  onSelect,
  className,
}: CategoryTabsBarProps) {
  const containerClasses = cn(
    'sticky top-0 z-40 border-b px-3 py-2 backdrop-blur-xl',
    isLight
      ? 'border-slate-900/8 bg-[#fffdf9]/90'
      : 'border-white/10 bg-[#101112]/90',
    className
  )

  const inactivePillClasses = isLight
    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent'
    : 'bg-[#1f1f1f] text-slate-300 hover:bg-[#2a2a2a] border-transparent'

  return (
    <div className={containerClasses}>
      <div className='mx-auto no-scrollbar flex max-w-5xl gap-2 overflow-x-auto px-1 py-1 whitespace-nowrap'>
        {categories.map((cat) => {
          const isActive = cat.id === activeId
          const label = cat.name_ar ?? cat.name

          if (template.id === 'delivery') {
            const cover = cat.items.find((item) => item.image_path)?.image_path
            const image = cover
              ? cover.startsWith('http://') || cover.startsWith('https://')
                ? cover
                : getMenuImageUrl(cover)
              : null
            return (
              <button
                key={cat.id}
                type='button'
                onClick={() => onSelect(cat.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'delivery-tabs__item',
                  isActive && 'is-active'
                )}
                style={isActive ? { '--delivery-accent': accentColor } as React.CSSProperties : undefined}
              >
                <span className='delivery-tabs__image'>
                  {image ? <img src={image} alt='' /> : <UtensilsCrossed className='size-4' />}
                </span>
                <span>{label}</span>
              </button>
            )
          }

          if (template.tabStyle === 'underline') {
            return (
              <button
                key={cat.id}
                type='button'
                onClick={() => onSelect(cat.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'shrink-0 border-b-2 px-1 pb-1 text-sm font-medium transition-colors',
                  isLight ? 'text-slate-600' : 'text-slate-300',
                  isActive ? 'border-current' : 'border-transparent'
                )}
                style={isActive ? { color: accentColor } : undefined}
              >
                {label}
              </button>
            )
          }

          if (template.tabStyle === 'boxed') {
            return (
              <button
                key={cat.id}
                type='button'
                onClick={() => onSelect(cat.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                  isLight
                    ? 'border-slate-200 bg-white text-slate-700'
                    : 'border-white/20 bg-[#0d0d0d] text-white'
                )}
                style={
                  isActive
                    ? {
                        color: '#ffffff',
                        borderColor: accentColor,
                        backgroundColor: accentColor,
                      }
                    : undefined
                }
              >
                {label}
              </button>
            )
          }

          if (template.tabStyle === 'minimal') {
            return (
              <button
                key={cat.id}
                type='button'
                onClick={() => onSelect(cat.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'shrink-0 px-2 py-1 text-sm font-medium tracking-wide uppercase transition-colors',
                  isLight ? 'text-slate-600' : 'text-slate-400',
                  isActive ? 'font-bold' : ''
                )}
                style={isActive ? { color: accentColor } : undefined}
              >
                {label}
              </button>
            )
          }

          // pills (الافتراضي)
          return (
            <button
              key={cat.id}
              type='button'
              onClick={() => onSelect(cat.id)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                isActive ? 'shadow-md' : inactivePillClasses
              )}
              style={
                isActive
                  ? { backgroundColor: accentColor, color: '#ffffff' }
                  : undefined
              }
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
