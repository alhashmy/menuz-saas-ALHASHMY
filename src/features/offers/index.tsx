import { useState } from 'react'
import { BadgePercent, Loader2, Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useMenuItems } from '@/features/menu/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Switch } from '@/components/ui/switch'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDeleteOffer, useOffers, useToggleOfferActive } from './api'
import { OfferDialog } from './components/offer-dialog'
import type { Offer } from './types'

function discountLabel(offer: Offer) {
  return offer.discount_kind === 'percentage'
    ? `${offer.discount_value}%`
    : `${offer.discount_value} د.ع`
}

export function OffersManagement() {
  const { data: offers = [], isLoading } = useOffers()
  const { data: items = [] } = useMenuItems()
  const toggleActive = useToggleOfferActive()
  const deleteOffer = useDeleteOffer()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null)

  function itemName(itemId: string | null) {
    if (!itemId) return null
    const item = items.find((i) => i.id === itemId)
    return item?.name_ar ?? item?.name ?? 'وجبة محذوفة'
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteOffer.mutateAsync(deleteTarget.id)
      toast.success('تم حذف العرض.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر الحذف.')
    } finally {
      setDeleteTarget(null)
    }
  }

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
            <h1 className='text-2xl font-bold tracking-tight'>العروض والخصومات</h1>
            <p className='text-muted-foreground'>
              خصومات على وجبات محددة أو أكواد برومو على كامل الطلب.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingOffer(null)
              setDialogOpen(true)
            }}
          >
            <Plus /> عرض جديد
          </Button>
        </div>

        {isLoading ? (
          <div className='flex h-40 items-center justify-center text-muted-foreground'>
            <Loader2 className='me-2 size-5 animate-spin' /> جارِ التحميل...
          </div>
        ) : offers.length === 0 ? (
          <div className='rounded-lg border border-dashed p-10 text-center text-muted-foreground'>
            لا توجد عروض بعد. أنشئ أول خصم أو كود برومو لجذب الزبائن.
          </div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {offers.map((offer) => (
              <Card key={offer.id} className={!offer.is_active ? 'opacity-60' : undefined}>
                <CardContent className='flex flex-col gap-3 pt-4'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                        {offer.scope === 'order' ? (
                          <Tag className='size-4' />
                        ) : (
                          <BadgePercent className='size-4' />
                        )}
                      </span>
                      <div>
                        <p className='font-semibold'>{offer.title_ar ?? offer.title}</p>
                        <p className='text-xs text-muted-foreground'>
                          {offer.scope === 'order'
                            ? `كود: ${offer.promo_code}`
                            : itemName(offer.item_id)}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={offer.is_active}
                      onCheckedChange={(checked) =>
                        toggleActive.mutate({ id: offer.id, is_active: checked })
                      }
                    />
                  </div>

                  <div className='flex items-center justify-between'>
                    <Badge variant='secondary' className='text-sm'>
                      خصم {discountLabel(offer)}
                    </Badge>
                    <div className='flex gap-1'>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => {
                          setEditingOffer(offer)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className='size-4' />
                      </Button>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => setDeleteTarget(offer)}
                      >
                        <Trash2 className='size-4 text-destructive' />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Main>

      <OfferDialog open={dialogOpen} onOpenChange={setDialogOpen} offer={editingOffer} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='تأكيد الحذف'
        desc={`هل أنت متأكد من حذف عرض "${deleteTarget?.title_ar ?? deleteTarget?.title}"؟`}
        confirmText='حذف'
        destructive
        handleConfirm={confirmDelete}
      />
    </>
  )
}
