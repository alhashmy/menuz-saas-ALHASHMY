import { Link } from '@tanstack/react-router'
import { QrCode } from 'lucide-react'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'

export function LandingNavbar() {
  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6'>
        <Link to='/' className='flex items-center gap-2 font-bold'>
          <span className='flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
            <QrCode className='size-4' />
          </span>
          <span className='text-lg'>Menuz</span>
        </Link>

        <nav className='hidden items-center gap-1 md:flex'>
          <Button variant='ghost' asChild>
            <Link to='/sign-in'>تسجيل دخول الموظفين</Link>
          </Button>
          <Button variant='ghost' asChild>
            <Link to='/sign-in'>تسجيل الدخول</Link>
          </Button>
          <Button asChild>
            <Link to='/sign-up'>إنشاء حساب</Link>
          </Button>
          <ThemeSwitch />
        </nav>

        <div className='flex items-center gap-2 md:hidden'>
          <ThemeSwitch />
          <Button size='sm' asChild>
            <Link to='/sign-up'>إنشاء حساب</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
