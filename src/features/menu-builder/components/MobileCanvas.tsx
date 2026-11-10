'use client'

import { useCallback } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Edit, Link } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useMenuBuilderStore } from '../store'
import type { DraftCategory, DraftItem, MenuLayout } from '../types'

function SortableCategory({
  item,
  index,
  onEdit,
  onDelete,
  onItemClick,
  accentColor,
}: {
  item: DraftCategory
  index: number
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onItemClick: (id: string) => void
  accentColor: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const store = useMenuBuilderStore()
  const categoryItems = store.items
    .filter((i) => i.category_id === item.id && !i._isDeleted)
    .sort((a, b) => a.sort_order - b.sort_order)

  const currentLayout = (store.style?.layout ?? 'grid-2') as 'list' | 'grid-2' | 'grid-3' | 'cards'

  return (
    <div
      ref={setNodeRef}
      style={style as React.CSSProperties}
      {...attributes}
      {...listeners}
      className={cn(
        'rounded-xl border border-white/5 bg-white/5 p-4 mb-3 shadow-lg shadow-black/20',
        !item.is_active && 'opacity-40 grayscale'
      )}
    >
      <div className='flex items-center justify-between px-2 mb-3'>
        <div className='flex items-center gap-2 cursor-grab active:cursor-grabbing'>
          <GripVertical className='size-4 text-slate-400' />
          <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>
            {index + 1}
          </span>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='size-6 p-1 hover:bg-white/10'
            onClick={() => onEdit(item.id)}
          >
            <Edit className='size-4 text-slate-300' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-6 p-1 hover:bg-red-500/20 text-destructive'
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className='size-4' />
          </Button>
        </div>
      </div>

      <h3 className={cn(
        'px-2 text-sm font-semibold mb-3 truncate'
      )}>
        {item.name_ar ?? item.name}
      </h3>

      {currentLayout === 'grid-2' ? (
        <div className='grid grid-cols-2 gap-2.5 px-2'>
          {categoryItems.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              layout={currentLayout}
              accentColor={accentColor}
              onClick={() => onItemClick(item.id)}
            />
          ))}
        </div>
      ) : currentLayout === 'grid-3' ? (
        <div className='grid grid-cols-3 gap-2.5 px-2'>
          {categoryItems.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              layout={currentLayout}
              accentColor={accentColor}
              onClick={() => onItemClick(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-2.5 px-2'>
          {categoryItems.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              layout={currentLayout}
              accentColor={accentColor}
              onClick={() => onItemClick(item.id)}
            />
          ))}
        </div>
      )}

      <Button
        variant='outline'
        size='sm'
        onClick={() => store.addItem(item.id)}
        className='w-full mt-3 py-1.5 text-xs border-white/10 hover:bg-white/5'
      >
        <Link className='size-3.5 mr-1.5' /> إضافة وجبة
      </Button>
    </div>
  )
}

function SortableItem({
  item,
  layout,
  accentColor,
  onClick,
}: {
  item: DraftItem
  layout: MenuLayout
  accentColor: string
  onClick: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style as React.CSSProperties}
      {...attributes}
      {...listeners}
      className={cn(
        'flex flex-col gap-1.5 p-2.5 rounded-lg transition-colors border',
        layout === 'grid-2' || layout === 'grid-3' ? 'h-32' : '',
        item.is_available
          ? 'bg-white/5 border-white/10 text-slate-100 hover:bg-white/10'
          : 'bg-white/5 border-white/5 text-slate-500 opacity-60'
      )}
      onClick={() => onClick(item.id)}
    >
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1 shrink-0'>
          <GripVertical className='size-3 text-slate-500' />
          <span className='text-[9px] font-bold text-slate-500'>
            {item.sort_order + 1}
          </span>
        </div>
      </div>

      {item.image_path && (
        <div className='h-14 w-full rounded-md overflow-hidden mb-1.5 border border-white/5 bg-slate-800'>
          <img
            src={item.image_path}
            alt={item.name_ar ?? item.name}
            className='w-full h-full object-cover'
          />
        </div>
      )}

      <div className='text-sm font-medium truncate text-slate-100 leading-tight' title={item.name_ar ?? item.name}>
        {item.name_ar ?? item.name}
      </div>
      <div className='text-xs text-slate-400 truncate' title={item.description ?? ''}>
        {item.description ?? '—'}
      </div>
      <div className='flex items-center justify-between gap-2 mt-1.5'>
        <span className='text-xs font-bold whitespace-nowrap' style={{ color: accentColor }}>
          {item.price.toFixed(2)} د.ع
        </span>
        <Button
          variant='ghost'
          size='icon'
          className='size-5 p-0.5 hover:bg-red-500/20 text-destructive'
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <Trash2 className='size-3.5' />
        </Button>
      </div>
    </div>
  )
}

interface MobileCanvasProps {
  categories: DraftCategory[]
  items: DraftItem[]
  style: { layout: MenuLayout; accentColor: string; bannerUrls: string[]; neonEnabled: boolean; neonColor: string }
  onCategoryEdit: (id: string) => void
  onCategoryDelete: (id: string) => void
  onItemClick: (id: string) => void
  onReorderCategories: (ids: string[]) => void
  onReorderItems: (categoryId: string, ids: string[]) => void
}

export function MobileCanvas({
  categories,
  items,
  style,
  onCategoryEdit,
  onCategoryDelete,
  onItemClick,
  onReorderCategories,
  onReorderItems,
}: MobileCanvasProps) {
  const { accentColor, bannerUrls, neonEnabled, neonColor, backgroundColor } = style
  const sensors = useSensors(useSensor(PointerSensor))
  const orderedCategories = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const isCategory = orderedCategories.some((c) => c.id === active.id)
      if (isCategory) {
        const activeIndex = orderedCategories.findIndex((c) => c.id === active.id)
        const overIndex = orderedCategories.findIndex((c) => c.id === over.id)
        if (activeIndex === -1 || overIndex === -1) return
        const next = arrayMove(orderedCategories, activeIndex, overIndex)
        onReorderCategories(next.map((c) => c.id))
        return
      }

      const activeItem = items.find((i) => i.id === active.id)
      const overItem = items.find((i) => i.id === over.id)
      if (!activeItem || !overItem || activeItem.category_id !== overItem.category_id) return
      const categoryItems = items
        .filter((i) => i.category_id === activeItem.category_id && !i._isDeleted)
        .sort((a, b) => a.sort_order - b.sort_order)
      const activeIdx = categoryItems.findIndex((i) => i.id === active.id)
      const overIdx = categoryItems.findIndex((i) => i.id === over.id)
      if (activeIdx === -1 || overIdx === -1) return
      const next = arrayMove(categoryItems, activeIdx, overIdx)
      onReorderItems(activeItem.category_id, next.map((i) => i.id))
    },
    [orderedCategories, items, onReorderCategories, onReorderItems]
  )

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className='relative'>
          {/* إطار الهاتف الوهمي */}
          <div
            className='w-[380px] h-[780px] rounded-[3rem] border-[14px] border-slate-900 shadow-2xl shadow-black/40 bg-black overflow-hidden relative'
            style={{ '--menu-accent': accentColor } as React.CSSProperties }
          >
            {/* شريط حالة الهاتف */}
          <div className='h-10 bg-black flex items-center justify-center border-b border-white/5'>
            <div className='flex items-center gap-1.5 px-4'>
              <div className='h-2 w-1/3 rounded-full bg-slate-600' />
              <div className='h-2 w-1/3 rounded-full bg-slate-600' />
              <div className='h-2 w-1/3 rounded-full bg-slate-600' />
              <div className='ml-auto text-[10px] text-slate-400 font-mono'>12:00</div>
            </div>
          </div>

          {/* محتوى المنيو داخل الهاتف */}
          <div className={cn('p-4 overflow-y-auto h-full', neonEnabled && 'neon-frame')} style={{ '--neon-glow': neonColor, '--bg': 'var(--background)', backgroundColor }}>
            {(bannerUrls || []).length > 0 && (
              <div className='relative w-full aspect-[16/9] max-h-[240px] overflow-hidden rounded-b-3xl mb-4'>
                <img
                  src={bannerUrls[0]}
                  alt='اللوحة الإعلانية'
                  className='w-full h-full object-cover'
                />
                {(bannerUrls || []).length > 1 && (
                  <div className='absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5'>
                    {(bannerUrls || []).map((_url: string, i: number) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i === 0 ? 'bg-emerald-500' : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            <SortableContext items={orderedCategories.map((c) => c.id)}>
              <div className='space-y-0'>
                {orderedCategories.length === 0 && (
                  <div className='h-full flex flex-col items-center justify-center text-slate-500 text-sm py-20'>
                    لا توجد أقسام. أضف قسمًا لبدء البناء.
                  </div>
                )}
                {orderedCategories.map((cat, index) => (
                  <SortableCategory
                    key={cat.id}
                    item={cat}
                    index={index}
                    accentColor={accentColor}
                    onEdit={onCategoryEdit}
                    onDelete={onCategoryDelete}
                    onItemClick={onItemClick}
                  />
                ))}
              </div>
            </SortableContext>
          </div>

          {/* مؤشر السفلى للهاتف */}
          <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex w-12 h-1.5 rounded-full bg-white/20' />
        </div>
      </div>
    </DndContext>
  )
}
