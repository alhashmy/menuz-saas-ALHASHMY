import { useState } from 'react'
import { UtensilsCrossed, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { MAX_CART_ITEM_QUANTITY, useCartStore } from '@/stores/cart-store'
import { getMenuImageUrl } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import {
  applyItemOffer,
  type PublicItemOffer,
  type PublicMenuItem,
} from '../api'

interface ItemDetailsSheetProps {
  item: PublicMenuItem | null
  accentColor: string
  offer?: PublicItemOffer
  onOpenChange: (open: boolean) => void
  isAvailable?: boolean
  themeMode?: 'light' | 'dark'
}

export function ItemDetailsSheet({
  item,
  accentColor,
  offer,
  onOpenChange,
  isAvailable = true,
  themeMode = 'dark',
}: ItemDetailsSheetProps) {
  const { finalPrice, hasDiscount } = item
    ? applyItemOffer(item.price, offer)
    : { finalPrice: 0, hasDiscount: false }
  const { addItem } = useCartStore()
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  const isDark = themeMode === 'dark'
  const isLight = !isDark
  const bg = isLight ? 'bg-white' : 'bg-[#0d0d0d]'
  const muted = isLight ? 'text-slate-500' : 'text-slate-400'
  const border = isLight ? 'border-slate-200' : 'border-white/10'
  const imageUrl = item?.image_path
    ? item.image_path.startsWith('https://') ||
      item.image_path.startsWith('http://')
      ? item.image_path
      : getMenuImageUrl(item.image_path)
    : null

  function handleAddToCart() {
    if (!item || !isAvailable) return
    addItem({
      id: item.id,
      name: item.name_ar ?? item.name,
      price: finalPrice,
      imagePath: item.image_path,
      notes,
      quantity,
    })
    toast('أُضيف إلى السلة', {
      description: `${item.name_ar ?? item.name} × ${quantity}`,
    })
    setQuantity(1)
    setNotes('')
    onOpenChange(false)
  }

  const total = finalPrice * quantity

  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent
        side='bottom'
        className={`${bg} h-auto max-h-[90vh] w-full p-0`}
      >
        {item && (
          <>
            <div
              className={cn(
                'mx-auto mb-2 h-1.5 w-10 rounded-full',
                isLight ? 'bg-slate-200' : 'bg-[#1f1f1f]'
              )}
            />

            <div className='relative mb-4'>
              {hasDiscount && offer && (
                <Badge className='absolute top-2 right-2 z-10 bg-red-600 text-white'>
                  خصم{' '}
                  {offer.discount_kind === 'percentage'
                    ? `${offer.discount_value}%`
                    : `${offer.discount_value} د.ع`}
                </Badge>
              )}
              {!isAvailable && (
                <Badge className='absolute top-2 left-2 z-10 bg-red-600 text-white'>
                  غير متوفر
                </Badge>
              )}
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item.name_ar ?? item.name}
                  className={cn(
                    'h-48 w-full rounded-xl object-cover',
                    isLight ? 'bg-slate-100' : 'bg-[#141923]'
                  )}
                />
              ) : (
                <div
                  className={cn(
                    'flex h-48 w-full items-center justify-center rounded-xl',
                    isLight ? 'bg-slate-100' : 'bg-[#141923]',
                    muted
                  )}
                >
                  <UtensilsCrossed className='size-10' />
                </div>
              )}
            </div>

            <div className='flex flex-col gap-3 p-4'>
              <SheetHeader className='mb-0 p-0'>
                <SheetTitle
                  className={cn(
                    'text-xl font-bold',
                    isLight ? 'text-slate-900' : 'text-white'
                  )}
                >
                  {item.name_ar ?? item.name}
                </SheetTitle>
                {(item.description_ar || item.description) && (
                  <SheetDescription
                    className={cn(
                      'text-start',
                      muted,
                      'text-sm leading-relaxed'
                    )}
                  >
                    {item.description_ar ?? item.description}
                  </SheetDescription>
                )}
              </SheetHeader>

              <div className='flex items-baseline gap-2'>
                <span
                  className='text-2xl font-bold'
                  style={{ color: accentColor }}
                >
                  {finalPrice.toFixed(2)} د.ع
                </span>
                {hasDiscount && (
                  <span className='text-sm text-muted-foreground line-through'>
                    {item.price.toFixed(2)} د.ع
                  </span>
                )}
              </div>

              <div className='space-y-2'>
                <Label
                  htmlFor='item-notes'
                  className={cn('text-sm font-medium', muted, 'block')}
                >
                  ملاحظات خاصة على الوجبة (اختياري)
                </Label>
                <Textarea
                  id='item-notes'
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder='مثل: بدون بصل، شواء جيد'
                  rows={2}
                  maxLength={240}
                  className={cn(
                    isLight
                      ? 'border-slate-200 bg-slate-100 text-slate-900 placeholder-slate-500'
                      : 'border-slate-700 bg-slate-800/50 text-slate-100 placeholder-slate-500',
                    'text-sm'
                  )}
                />
              </div>

              <div
                className={cn(
                  'flex items-center justify-between gap-3',
                  border,
                  'pt-3'
                )}
              >
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='size-10 rounded-lg'
                    disabled={quantity <= 1 || !isAvailable}
                    onClick={() => setQuantity(quantity - 1)}
                  >
                    <Minus className='size-4' />
                  </Button>
                  <span className='w-8 text-center text-lg font-bold'>
                    {quantity}
                  </span>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='size-10 rounded-lg'
                    disabled={!isAvailable}
                    onClick={() =>
                      setQuantity((current) =>
                        Math.min(MAX_CART_ITEM_QUANTITY, current + 1)
                      )
                    }
                  >
                    <Plus className='size-4' />
                  </Button>
                </div>
                <Button
                  type='button'
                  size='lg'
                  className={cn(
                    'w-full rounded-xl text-white shadow-lg shadow-accent/40',
                    !isAvailable && 'pointer-events-none opacity-50'
                  )}
                  disabled={!isAvailable}
                  style={{ backgroundColor: accentColor }}
                  onClick={handleAddToCart}
                >
                  إضافة إلى السلة • {total.toLocaleString('ar-IQ')} د.ع
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
