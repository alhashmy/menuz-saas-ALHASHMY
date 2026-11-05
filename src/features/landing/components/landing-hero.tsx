import { Link } from '@tanstack/react-router'
import { ArrowLeft, LogIn, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingHero() {
  return (
    <section className='relative overflow-hidden border-b'>
      <div
        className='pointer-events-none absolute inset-0 -z-10 opacity-40'
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--primary) 20%, transparent), transparent 40%), radial-gradient(circle at 80% 0%, color-mix(in oklab, var(--primary) 15%, transparent), transparent 35%)',
        }}
      />

      <div className='mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28'>
        <span className='inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground'>
          <ScanLine className='size-4' />
          نظام تشغيل مطاعم قائم على QR
        </span>

        <h1 className='text-4xl font-extrabold tracking-tight text-balance sm:text-6xl'>
          رمز QR واحد.
          <br />
          <span className='text-primary'>مطعمك بأكمله موصول.</span>
        </h1>

        <p className='max-w-2xl text-lg text-muted-foreground text-balance sm:text-xl'>
          امسح. اطلب. Menuz هو نظام تشغيل المطاعم القائم على رمز QR.
        </p>

        <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
          <Button size='lg' className='gap-2' asChild>
            <Link to='/sign-up'>
              ابدأ التجربة المجانية
              <ArrowLeft className='size-4' />
            </Link>
          </Button>
          <Button size='lg' variant='outline' className='gap-2' asChild>
            <Link to='/sign-in'>
              <LogIn className='size-4' />
              تسجيل الدخول
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
