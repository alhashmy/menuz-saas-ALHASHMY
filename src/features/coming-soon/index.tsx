import { Telescope } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

interface ComingSoonPageProps {
  title: string
  description?: string
}

export function ComingSoonPage({
  title,
  description = 'هذه الصفحة قيد الإنشاء حالياً. ترقّبوا الإصدار القادم!',
}: ComingSoonPageProps) {
  return (
    <>
      <Header>
        <div className='ms-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='flex h-[60vh] flex-col items-center justify-center gap-3 text-center'>
          <span className='flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary'>
            <Telescope className='size-8' />
          </span>
          <h1 className='text-2xl font-bold'>{title}</h1>
          <p className='max-w-sm text-muted-foreground'>{description}</p>
        </div>
      </Main>
    </>
  )
}
