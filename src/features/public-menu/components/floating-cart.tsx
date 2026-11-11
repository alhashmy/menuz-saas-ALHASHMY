'use client'

import { ChevronRight } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { cn } from '@/lib/utils'
import type { OperatingHours } from '../api'
import { CartSheet } from './cart-sheet'

interface FloatingCartProps {
  accentColor: string
  isLight: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  cartCount: number
  restaurantId?: string
  restaurantIsOpen: boolean
  operatingHours: OperatingHours[]
  restaurantName: string
}

export function FloatingCart({
  accentColor,
  isLight,
  open,
  onOpenChange,
  cartCount,
  restaurantId,
  restaurantIsOpen,
  operatingHours,
  restaurantName,
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
        restaurantIsOpen={restaurantIsOpen}
        operatingHours={operatingHours}
        restaurantName={restaurantName}
      />
      <button
        type='button'
        className={cn(
          'fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-2xl p-3.5 shadow-2xl',
          textColor
        )}
        style={{ backgroundColor: accentColor }}
        onClick={() => onOpenChange(true)}
        aria-label='عرض السلة وإتمام الطلب'
      >
        {/* اليمين: عدد الوجبات داخل دائرة + النص */}
        <div className='flex items-center gap-2'>
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
              countBg,
              countText
            )}
          >
            {cartCount}
          </div>
          <span className={cn('text-sm font-medium', textColor)}>
            عرض السلة وإتمام الطلب
          </span>
        </div>
        {/* اليسار: المجموع الكلي مع سهم */}
        <div className='flex items-center gap-2'>
          <span className={cn('font-bold', textColor)}>
            {total.toLocaleString('ar-IQ')} د.ع
          </span>
          <ChevronRight className={cn('size-4 rtl:rotate-180', textColor)} />
        </div>
      </button>
    </>
  )
}
