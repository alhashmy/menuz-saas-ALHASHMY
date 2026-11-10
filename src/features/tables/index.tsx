import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useLanguage } from '@/i18n'
import { useRestaurantTables } from './api'
import { AddTableDialog } from './components/add-table-dialog'
import { TableQrCard } from './components/table-qr-card'

export function TablesManagement() {
  const { language, t } = useLanguage()
  const { data: tables = [], isLoading } = useRestaurantTables()
  const restaurantSlug = useAuthStore((s) => s.restaurant?.slug)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{t('qr.title')}</h1>
            <p className='text-muted-foreground'>
              {t('qr.description')}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus /> {t('qr.newTable')}
          </Button>
        </div>

        {isLoading ? (
          <div className='flex h-40 items-center justify-center text-muted-foreground'>
            <Loader2 className='me-2 size-5 animate-spin' /> {t('common.loading')}
          </div>
        ) : tables.length === 0 ? (
          <div className='rounded-lg border border-dashed p-10 text-center text-muted-foreground'>
            {language === 'ar'
              ? 'لا توجد طاولات بعد. أضف أول طاولة لتوليد رمز QR الخاص بها.'
              : 'No tables yet. Add your first table to generate its unique QR code.'}
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
            {tables.map((table) => (
              <TableQrCard
                key={table.id}
                table={table}
                restaurantSlug={restaurantSlug ?? ''}
              />
            ))}
          </div>
        )}
      </Main>

      <AddTableDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
