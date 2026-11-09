'use client'

import { useCallback, useEffect } from 'react'
import { X, Save, Eye, Image as ImageIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useMenuBuilderStore } from '../store'

interface PropertiesPanelProps {
  open: boolean
  target: { type: 'item' | 'category'; id: string } | null
  onClose: () => void
}

export function PropertiesPanel({
  open,
  target,
  onClose,
}: PropertiesPanelProps) {
  const {
    items,
    categories,
    updateItem,
    updateCategory,
    deleteItem,
    deleteCategory,
    setEditedItem,
  } = useMenuBuilderStore()

  const item = items.find((i) => i.id === target?.id && target?.type === 'item')
  const category =
    categories.find((c) => c.id === target?.id && target?.type === 'category') ??
    null

  const isItem = target?.type === 'item'

  const handleSave = useCallback(() => {
    setEditedItem(null)
    onClose()
    toast.success('تم التعديل')
  }, [setEditedItem, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !target) return null

  return (
    <>
      {/* backdrop */}
      <div
        className='fixed inset-0 bg-black/40 backdrop-blur-sm z-40'
        onClick={onClose}
      />
      {/* slide-over panel */}
      <div
        className={`fixed right-0 top-0 h-full w-[440px] bg-slate-900/95 backdrop-blur-md border-l border-white/10 shadow-2xl shadow-black/60 flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className='px-6 py-5 border-b border-white/5 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-white'>
            {isItem ? 'تعديل الوجبة' : 'تعديل القسم'}
          </h2>
          <Button
            variant='ghost'
            size='sm'
            className='size-8 rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10'
            onClick={onClose}
          >
            <X className='size-4' />
          </Button>
        </div>

        <div className='p-6 overflow-y-auto space-y-5'>
          {isItem ? (
            <>
              <div className='space-y-2'>
                <Label className='text-sm font-medium text-slate-300'>
                  الاسم (عربي)
                </Label>
                <Input
                  defaultValue={item?.name_ar ?? item?.name ?? ''}
                  onChange={(e) =>
                    updateItem(item!.id, {
                      name_ar: e.target.value || null,
                    })
                  }
                  className='bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500'
                />
              </div>
              <div className='space-y-2'>
                <Label className='text-sm font-medium text-slate-300'>
                  الاسم (إنجليزي)
                </Label>
                <Input
                  defaultValue={item?.name ?? ''}
                  onChange={(e) => updateItem(item!.id, { name: e.target.value })}
                  className='bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500'
                />
              </div>
              <div className='space-y-2'>
                <Label className='text-sm font-medium text-slate-300'>السعر</Label>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    step='0.01'
                    min='0'
                    defaultValue={item?.price?.toString() ?? '0'}
                    onChange={(e) =>
                      updateItem(item!.id, {
                        price: Number(e.target.value) || 0,
                      })
                    }
                    className='flex-1 bg-slate-800/50 border-slate-700 text-slate-100'
                  />
                  <span className='text-slate-400 text-xs'>د.ع</span>
                </div>
              </div>
              <div className='space-y-2'>
                <Label className='text-sm font-medium text-slate-300'>الوصف</Label>
                <Textarea
                  defaultValue={item?.description ?? ''}
                  onChange={(e) =>
                    updateItem(item!.id, {
                      description: e.target.value || null,
                    })
                  }
                  rows={3}
                  className='bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500'
                />
              </div>
              <div className='space-y-2'>
                <Label className='text-sm font-medium text-slate-300 flex items-center gap-2'>
                  <ImageIcon className='size-4' /> مسار الصورة
                </Label>
                <Input
                  defaultValue={item?.image_path ?? ''}
                  onChange={(e) =>
                    updateItem(item!.id, {
                      image_path: e.target.value || null,
                    })
                  }
                  placeholder='menu-items/dish.jpg'
                  className='bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500'
                />
              </div>
              <div className='space-y-2'>
                <Label className='text-sm font-medium text-slate-300 flex items-center gap-2'>
                  <Eye className='size-4' /> متوفر للطلب
                </Label>
                <Switch
                  checked={item?.is_available ?? true}
                  onCheckedChange={(checked) =>
                    updateItem(item!.id, { is_available: checked })
                  }
                />
              </div>
              {!item?._isNew && (
                <div className='pt-3 border-t border-white/5'>
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={() => {
                      deleteItem(item!.id)
                      setEditedItem(null)
                      onClose()
                      toast.success('تم الحذف')
                    }}
                  >
                    <Trash2 className='size-4 mr-1.5' /> حذف الوجبة
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className='space-y-2'>
                <Label className='text-sm font-medium text-slate-300'>
                  اسم القسم (عربي)
                </Label>
                <Input
                  defaultValue={category?.name_ar ?? category?.name ?? ''}
                  onChange={(e) =>
                    updateCategory(category!.id, {
                      name_ar: e.target.value || null,
                    })
                  }
                  className='bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500'
                />
              </div>
              <div className='space-y-2'>
                <Label className='text-sm font-medium text-slate-300'>
                  اسم القسم (إنجليزي)
                </Label>
                <Input
                  defaultValue={category?.name ?? ''}
                  onChange={(e) => updateCategory(category!.id, { name: e.target.value })}
                  className='bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500'
                />
              </div>
              <div className='space-y-2'>
                <Label className='text-sm font-medium text-slate-300 flex items-center gap-2'>
                  <Eye className='size-4' /> قسم نشط
                </Label>
                <Switch
                  checked={category?.is_active ?? true}
                  onCheckedChange={(checked) =>
                    updateCategory(category!.id, { is_active: checked })
                  }
                />
              </div>
              {!category?._isNew && (
                <div className='pt-3 border-t border-white/5'>
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={() => {
                      deleteCategory(category!.id)
                      setEditedItem(null)
                      onClose()
                      toast.success('تم الحذف')
                    }}
                  >
                    <Trash2 className='size-4 mr-1.5' /> حذف القسم
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className='p-4 border-t border-white/5 flex justify-end gap-2 bg-slate-900/80 backdrop-blur'>
          <Button variant='outline' onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave}>
            <Save className='size-4 mr-2' /> حفظ التغييرات
          </Button>
        </div>
      </div>
    </>
  )
}
