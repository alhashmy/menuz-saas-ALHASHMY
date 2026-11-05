import { UtensilsCrossed } from 'lucide-react'
import { getMenuImageUrl } from '@/lib/supabase'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { applyItemOffer, type PublicItemOffer, type PublicMenuItem } from '../api'

interface ItemDetailsSheetProps {
  item: PublicMenuItem | null
  accentColor: string
  offer?: PublicItemOffer
  onOpenChange: (open: boolean) => void
}

export function ItemDetailsSheet({
  item,
  accentColor,
  offer,
  onOpenChange,
}: ItemDetailsSheetProps) {
  const imageUrl = item ? getMenuImageUrl(item.image_path) : null
  const { finalPrice, hasDiscount } = item
    ? applyItemOffer(item.price, offer)
    : { finalPrice: 0, hasDiscount: false }

  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent side='bottom' className='max-h-[85vh] overflow-y-auto rounded-t-2xl'>
        {item && (
          <>
            <div className='mx-auto mb-2 h-1.5 w-10 rounded-full bg-muted' />

            <div className='relative mb-4'>
              {hasDiscount && offer && (
                <Badge className='absolute top-2 right-2 z-10 bg-red-600 text-white hover:bg-red-600'>
                  خصم{' '}
                  {offer.discount_kind === 'percentage'
                    ? `${offer.discount_value}%`
                    : `${offer.discount_value} ر.س`}
                </Badge>
              )}
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item.name_ar ?? item.name}
                  className='h-48 w-full rounded-xl object-cover'
                />
              ) : (
                <div className='flex h-48 w-full items-center justify-center rounded-xl bg-muted text-muted-foreground'>
                  <UtensilsCrossed className='size-10' />
                </div>
              )}
            </div>

            <SheetHeader className='p-0 text-start'>
              <SheetTitle className='text-xl'>{item.name_ar ?? item.name}</SheetTitle>
              {(item.description_ar || item.description) && (
                <SheetDescription className='text-start'>
                  {item.description_ar ?? item.description}
                </SheetDescription>
              )}
            </SheetHeader>

            <div className='mt-6 flex items-center justify-between'>
              <div className='flex items-baseline gap-2'>
                <span className='text-2xl font-bold' style={{ color: accentColor }}>
                  {finalPrice.toFixed(2)} ر.س
                </span>
                {hasDiscount && (
                  <span className='text-sm text-muted-foreground line-through'>
                    {item.price.toFixed(2)} ر.س
                  </span>
                )}
              </div>
              <Button
                size='lg'
                style={{ backgroundColor: accentColor }}
                className='text-white hover:opacity-90'
              >
                إضافة إلى الطلب
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
