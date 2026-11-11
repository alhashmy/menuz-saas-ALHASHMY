import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OrderArchive } from './OrderArchive'

interface ArchiveHistoryDialogProps {
  restaurantId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchiveHistoryDialog({ restaurantId, open, onOpenChange }: ArchiveHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[85vh] p-0'>
        <DialogHeader className='flex items-center justify-between border-b p-4'>
          <DialogTitle className='text-lg font-bold'>سجل الأرشيف</DialogTitle>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => onOpenChange(false)}
            aria-label='إغلاق'
          >
            <X className='size-4' />
          </Button>
        </DialogHeader>
        <div className='p-4 overflow-y-auto max-h-[calc(85vh-120px)]'>
          <OrderArchive restaurantId={restaurantId} />
        </div>
      </DialogContent>
    </Dialog>
  )
}