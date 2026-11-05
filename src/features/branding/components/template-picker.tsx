import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MENU_TEMPLATES } from '@/features/public-menu/templates/registry'

interface TemplatePickerProps {
  value: string
  onChange: (templateId: string) => void
}

export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
      {MENU_TEMPLATES.map((template) => {
        const isSelected = template.id === value
        const isAnimated = template.animation !== 'none'

        return (
          <button
            key={template.id}
            type='button'
            onClick={() => onChange(template.id)}
            className={cn(
              'relative flex flex-col gap-2 rounded-lg border p-3 text-start transition-all hover:shadow-md',
              isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
            )}
          >
            {isSelected && (
              <span className='absolute top-2 left-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                <Check className='size-3' />
              </span>
            )}

            {/* لقطة ألوان مصغّرة للقالب */}
            <div
              className='flex h-14 items-center justify-center gap-1 rounded-md'
              style={{
                background: `linear-gradient(135deg, ${template.previewPrimary}, ${template.previewAccent})`,
              }}
            >
              {isAnimated && (
                <span className='rounded-full bg-black/30 p-1 text-white'>
                  <Sparkles className='size-3.5' />
                </span>
              )}
            </div>

            <div>
              <p className='text-sm font-semibold'>{template.name}</p>
              <p className='mt-0.5 line-clamp-2 text-xs text-muted-foreground'>
                {template.description}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
