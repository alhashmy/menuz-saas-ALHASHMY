import { useState } from 'react'
import { Check, Copy, Tag } from 'lucide-react'
import type { PublicOrderOffer } from '../api'

interface PromoBannerProps {
  offers: PublicOrderOffer[]
  accentColor: string
}

function discountLabel(offer: PublicOrderOffer) {
  return offer.discount_kind === 'percentage'
    ? `${offer.discount_value}%`
    : `${offer.discount_value} د.ع`
}

export function PromoBanner({ offers, accentColor }: PromoBannerProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  if (offers.length === 0) return null

  async function handleCopy(code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1500)
  }

  return (
    <div className='flex gap-2 overflow-x-auto px-4 pt-3'>
      {offers.map((offer) => (
        <button
          key={offer.id}
          type='button'
          onClick={() => handleCopy(offer.promo_code)}
          className='flex shrink-0 items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-start'
          style={{ borderColor: accentColor }}
        >
          <Tag className='size-4 shrink-0' style={{ color: accentColor }} />
          <div className='leading-tight'>
            <p className='text-xs font-semibold'>
              {offer.title_ar ?? offer.title} — خصم {discountLabel(offer)}
            </p>
            <p dir='ltr' className='font-mono text-[11px] text-muted-foreground'>
              كود: {offer.promo_code}
            </p>
          </div>
          {copiedCode === offer.promo_code ? (
            <Check className='size-3.5 text-green-600' />
          ) : (
            <Copy className='size-3.5 text-muted-foreground' />
          )}
        </button>
      ))}
    </div>
  )
}
