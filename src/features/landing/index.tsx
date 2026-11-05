import { LandingNavbar } from './components/landing-navbar'
import { LandingHero } from './components/landing-hero'
import { LandingWorkflow } from './components/landing-workflow'

export function Landing() {
  return (
    <div className='flex min-h-svh flex-col bg-background'>
      <LandingNavbar />
      <main className='flex-1'>
        <LandingHero />
        <LandingWorkflow />
      </main>
      <footer className='border-t py-8 text-center text-sm text-muted-foreground'>
        © {new Date().getFullYear()} Menuz. جميع الحقوق محفوظة.
      </footer>
    </div>
  )
}
