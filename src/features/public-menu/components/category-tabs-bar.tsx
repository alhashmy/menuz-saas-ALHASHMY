import { cn } from '@/lib/utils'
import type { MenuTemplate } from '../templates/types'
import type { PublicMenuCategory } from '../api'

interface CategoryTabsBarProps {
  categories: PublicMenuCategory[]
  activeId: string
  accentColor: string
  template: MenuTemplate
  onSelect: (id: string) => void
}

export function CategoryTabsBar({
  categories,
  activeId,
  accentColor,
  template,
  onSelect,
}: CategoryTabsBarProps) {
  return (
    <div className='sticky top-0 z-40 border-b bg-slate-950/80 backdrop-blur-md'>
      <div className='scrollbar-none flex gap-3 overflow-x-auto whitespace-nowrap px-4 py-4'>
        {categories.map((cat) => {
          const isActive = cat.id === activeId
          const label = cat.name_ar ?? cat.name

          if (template.tabStyle === 'underline') {
            return (
              <button
                key={cat.id}
                type='button'
                onClick={() => onSelect(cat.id)}
                className={cn(
                  'shrink-0 border-b-2 px-1 pb-1 text-sm font-medium transition-colors',
                  isActive ? 'border-current' : 'border-transparent text-muted-foreground'
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
                className={cn(
                  'shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive ? 'border-current' : 'border-border text-muted-foreground'
                )}
                style={isActive ? { color: accentColor, borderColor: accentColor } : undefined}
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
                className={cn(
                  'shrink-0 px-2 py-1 text-sm font-medium uppercase tracking-wide transition-colors',
                  isActive ? 'font-bold' : 'text-muted-foreground'
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
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-transparent text-white'
                  : 'border-border bg-muted/50 text-muted-foreground'
              )}
              style={isActive ? { backgroundColor: accentColor } : undefined}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
