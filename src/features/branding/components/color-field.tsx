import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className='grid gap-2'>
      <Label>{label}</Label>
      <div className='flex items-center gap-2'>
        <input
          type='color'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className='size-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-1'
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className='font-mono'
          maxLength={7}
        />
      </div>
    </div>
  )
}
