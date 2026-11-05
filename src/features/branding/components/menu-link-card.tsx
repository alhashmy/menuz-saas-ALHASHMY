import { useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateRestaurantSlug } from '../api'

interface MenuLinkCardProps {
  slug: string
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function MenuLinkCard({ slug }: MenuLinkCardProps) {
  const updateSlug = useUpdateRestaurantSlug()
  const [isEditing, setIsEditing] = useState(false)
  const [draftSlug, setDraftSlug] = useState(slug)
  const [copied, setCopied] = useState(false)

  const menuUrl = `${window.location.origin}/menu/${slug}`

  async function handleCopy() {
    await navigator.clipboard.writeText(menuUrl)
    setCopied(true)
    toast.success('تم نسخ الرابط.')
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSaveSlug() {
    const cleaned = slugify(draftSlug)
    if (!cleaned) {
      toast.error('الرجاء إدخال رابط صالح (أحرف إنجليزية وأرقام وشرطات فقط).')
      return
    }
    try {
      await updateSlug.mutateAsync(cleaned)
      toast.success('تم تحديث رابط القائمة.')
      setIsEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر تحديث الرابط.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>رابط القائمة العام</CardTitle>
        <p className='text-sm text-muted-foreground'>
          شارك هذا الرابط مع زبائنك أو استخدمه في أكواد QR الخاصة بطاولاتك.
        </p>
      </CardHeader>
      <CardContent className='grid gap-3'>
        {isEditing ? (
          <div className='grid gap-2'>
            <Label>الرابط المخصص</Label>
            <div className='flex items-center gap-2'>
              <span className='shrink-0 text-sm text-muted-foreground'>
                {window.location.origin}/menu/
              </span>
              <Input
                value={draftSlug}
                onChange={(e) => setDraftSlug(e.target.value)}
                className='font-mono'
                dir='ltr'
                placeholder='my-restaurant'
              />
            </div>
            <div className='flex gap-2'>
              <Button
                size='sm'
                onClick={handleSaveSlug}
                disabled={updateSlug.isPending}
              >
                {updateSlug.isPending && <Loader2 className='animate-spin' />}
                حفظ الرابط
              </Button>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => {
                  setIsEditing(false)
                  setDraftSlug(slug)
                }}
              >
                إلغاء
              </Button>
            </div>
          </div>
        ) : (
          <div className='flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2'>
            <span dir='ltr' className='flex-1 truncate font-mono text-sm'>
              {menuUrl}
            </span>
            <Button size='icon' variant='ghost' onClick={handleCopy} title='نسخ الرابط'>
              {copied ? <Check className='size-4 text-green-600' /> : <Copy className='size-4' />}
            </Button>
            <Button size='icon' variant='ghost' asChild title='فتح القائمة'>
              <a href={menuUrl} target='_blank' rel='noreferrer'>
                <ExternalLink className='size-4' />
              </a>
            </Button>
            <Button
              size='icon'
              variant='ghost'
              onClick={() => setIsEditing(true)}
              title='تعديل الرابط'
            >
              <Pencil className='size-4' />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
