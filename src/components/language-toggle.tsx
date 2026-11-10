import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/i18n'

export function LanguageToggle() {
  const { language, toggleLanguage, t } = useLanguage()
  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      onClick={toggleLanguage}
      className='gap-1.5 text-muted-foreground hover:text-foreground'
      aria-label={t('language.switch')}
    >
      <Languages className='size-4' />
      <span className='hidden sm:inline'>{language === 'ar' ? 'EN' : 'ع'}</span>
    </Button>
  )
}
