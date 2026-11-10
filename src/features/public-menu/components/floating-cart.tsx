'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/stores/cart-store'
import { CartSheet } from './cart-sheet'

interface FloatingCartProps {
  accentColor: string
  isLight: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  cartCount: number
  restaurantId?: string
}

export function FloatingCart({
  accentColor,
  isLight,
  open,
  onOpenChange,
  cartCount,
  restaurantId,
}: FloatingCartProps) {
  const { items } = useCartStore()
  if (items.length === 0) return null

  const total = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * i.quantity,
    0
  )

  const textColor = isLight ? 'text-slate-900' : 'text-white'
  const countBg = isLight ? 'bg-slate-200' : 'bg-white/20'
  const countText = isLight ? 'text-slate-900' : 'text-white'

  return (
    <>
      <CartSheet
        open={open}
        onOpenChange={onOpenChange}
        restaurantId={restaurantId}
      />
      <button
        type='button'
        className={cn(
          'fixed bottom-4 inset-x-4 max-w-md mx-auto z-40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between',
          textColor
        )}
        style={{ backgroundColor: accentColor }}
        onClick={() => onOpenChange(true)}
        aria-label='عرض السلة وإتمام الطلب'
      >
        {/* اليمين: عدد الوجبات داخل دائرة + النص */}
        <div className='flex items-center gap-2'>
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
            countBg,
            countText
          )}>
            {cartCount}
          </div>
          <span className={cn('font-medium text-sm', textColor)}>عرض السلة وإتمام الطلب</span>
        </div>
        {/* اليسار: المجموع الكلي مع سهم */}
        <div className='flex items-center gap-2'>
          <span className={cn('font-bold', textColor)}>{total.toLocaleString('ar-IQ')} د.ع</span>
          <ChevronRight className={cn('size-4 rtl:rotate-180', textColor)} />
        </div>
      </button>
    </>
  )
}
