import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download, Printer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useDeleteTable, type RestaurantTable } from '../api'

interface TableQrCardProps {
  table: RestaurantTable
  restaurantSlug: string
}

export function TableQrCard({ table, restaurantSlug }: TableQrCardProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const deleteTable = useDeleteTable()

  const menuUrl = `${window.location.origin}/menu/${restaurantSlug}?table=${table.qr_token}`

  function handleDownload() {
    const canvas = canvasWrapperRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `qr-${table.label.replace(/\s+/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function handlePrint() {
    const canvas = canvasWrapperRef.current?.querySelector('canvas')
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const printWindow = window.open('', '_blank', 'width=400,height=500')
    if (!printWindow) return
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>طباعة QR - ${table.label}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 24px; }
            img { width: 240px; height: 240px; }
            h2 { margin-top: 16px; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" />
          <h2>${table.label}</h2>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  async function handleDelete() {
    try {
      await deleteTable.mutateAsync(table.id)
      toast.success('تم حذف الطاولة.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر الحذف.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>{table.label}</CardTitle>
      </CardHeader>
      <CardContent className='flex justify-center'>
        <div
          ref={canvasWrapperRef}
          className='rounded-lg border bg-white p-3'
        >
          <QRCodeCanvas value={menuUrl} size={160} level='M' />
        </div>
      </CardContent>
      <CardFooter className='flex flex-wrap justify-center gap-2'>
        <Button size='sm' variant='outline' onClick={handleDownload}>
          <Download className='size-4' /> تحميل
        </Button>
        <Button size='sm' variant='outline' onClick={handlePrint}>
          <Printer className='size-4' /> طباعة
        </Button>
        <Button
          size='sm'
          variant='ghost'
          className='text-destructive'
          onClick={handleDelete}
          disabled={deleteTable.isPending}
        >
          <Trash2 className='size-4' /> حذف
        </Button>
      </CardFooter>
    </Card>
  )
}
