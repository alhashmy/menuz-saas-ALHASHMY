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
import { GripVertical, Trash2, Edit, Link, UtensilsCrossed, Menu, Search, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useMenuBuilderStore } from '../store'
import type { DraftCategory, DraftItem, MenuTemplateId } from '../types'
import { useLanguage } from '@/i18n'
import { getMenuImageUrl } from '@/lib/supabase'

function SortableCategory({
  item,
  index,
  onEdit,
  onDelete,
  onItemClick,
  accentColor,
  cols,
}: {
  item: DraftCategory
  index: number
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onItemClick: (id: string) => void
  accentColor: string
  cols: string
}) {
  const { language } = useLanguage()
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

      <h3 className='px-2 text-sm font-semibold mb-3 truncate'>
        {language === 'ar' ? item.name_ar ?? item.name : item.name}
      </h3>

      <div className={cn('grid gap-2.5 px-2', cols)}>
        {categoryItems.map((item) => (
          <SortableItem
            key={item.id}
            item={item}
            accentColor={accentColor}
            onClick={() => onItemClick(item.id)}
          />
        ))}
      </div>

      <Button
        variant='outline'
        size='sm'
        onClick={() => store.addItem(item.id)}
        className='w-full mt-3 py-1.5 text-xs border-white/10 hover:bg-white/5'
      >
        <Link className='size-3.5 mr-1.5' /> {language === 'ar' ? 'إضافة وجبة' : 'Add item'}
      </Button>
    </div>
  )
}

function SortableItem({
  item,
  accentColor,
  onClick,
}: {
  item: DraftItem
  accentColor: string
  onClick: (id: string) => void
}) {
  const { language } = useLanguage()
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
        'flex flex-col gap-1.5 p-2.5 rounded-lg transition-colors border h-32',
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
            alt={language === 'ar' ? item.name_ar ?? item.name : item.name}
            className='w-full h-full object-cover'
          />
        </div>
      )}

      <div className='text-sm font-medium truncate text-slate-100 leading-tight' title={language === 'ar' ? item.name_ar ?? item.name : item.name}>
        {language === 'ar' ? item.name_ar ?? item.name : item.name}
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
  style: {
    menuTemplate: MenuTemplateId
    layoutTemplate: 'grid-cards' | 'visual-categories' | 'list-categories'
    accentColor: string
    secondaryColor: string
    gradientAngle: number
    neonLineEnabled: boolean
    bannerUrls: string[]
    isOpen: boolean
  }
  onCategoryEdit: (id: string) => void
  onCategoryDelete: (id: string) => void
  onItemClick: (id: string) => void
  onReorderCategories: (ids: string[]) => void
  onReorderItems: (categoryId: string, ids: string[]) => void
}

function previewImage(path: string | null | undefined) {
  if (!path) return null
  return path.startsWith('http://') || path.startsWith('https://') ? path : getMenuImageUrl(path)
}

function DeliveryAppPreview({
  categories, items, accentColor, bannerUrls, isOpen, restaurantName, language, onCategoryEdit, onItemClick,
}: Pick<MobileCanvasProps, 'categories' | 'items' | 'onCategoryEdit' | 'onItemClick'> & { accentColor: string; bannerUrls: string[]; isOpen: boolean; restaurantName: string | null; language: string }) {
  const activeCategory = categories.find((category) => category.is_active) ?? categories[0]
  const categoryItems = items.filter((item) => item.category_id === activeCategory?.id && !item._isDeleted).slice(0, 5)
  return <div className='relative'>
    <div className='h-[780px] w-[380px] overflow-hidden rounded-[3rem] border-[14px] border-slate-900 bg-[#fffaf7] text-right shadow-2xl shadow-black/40'>
      <div className='flex h-9 items-center justify-between border-b bg-white px-4 text-slate-700'><Menu className='size-4' /><span className='rounded-full bg-orange-50 px-2 py-1 text-[9px] font-bold text-orange-600'>🛵 {language === 'ar' ? 'توصيل' : 'Delivery'}</span><div className='flex gap-2'><Search className='size-4' /><span className='text-xs'>🛍</span></div></div>
      <div className='h-[calc(100%-2.25rem)] overflow-y-auto bg-white pb-5'>
        <div className='relative mx-3 mt-2 aspect-[16/10] overflow-hidden rounded-2xl bg-orange-100'>{bannerUrls[0] ? <img src={bannerUrls[0]} className='h-full w-full object-cover' /> : <div className='grid h-full place-items-center text-orange-300'><UtensilsCrossed className='size-10' /></div>}<div className='absolute bottom-2 left-2 flex gap-1'><i className='h-1.5 w-3 rounded bg-white' /><i className='h-1.5 w-1.5 rounded bg-white/70' /></div></div>
        <div className='relative z-10 mx-4 -mt-5 flex items-end gap-2'><div className='grid size-15 place-items-center overflow-hidden rounded-xl border-[3px] border-white bg-orange-500 text-white shadow-lg'><UtensilsCrossed className='size-6' /></div><div className='min-w-0 flex-1 pb-1'><h2 className='truncate text-sm font-extrabold text-orange-600'>{restaurantName ?? (language === 'ar' ? 'مطعمي' : 'My restaurant')}</h2><p className='text-[9px] text-slate-400'>{language === 'ar' ? 'ألذ الأطباق بانتظارك' : 'Freshly made for you'}</p></div><span className={'mb-1 rounded-full px-2 py-1 text-[9px] ' + (isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500')}>{isOpen ? (language === 'ar' ? 'مفتوح' : 'Open') : (language === 'ar' ? 'مغلق' : 'Closed')}</span></div>
        <div className='flex gap-3 overflow-hidden px-4 py-4'>{categories.slice(0, 5).map((category) => { const cover = previewImage(items.find((item) => item.category_id === category.id)?.image_path); return <button type='button' key={category.id} onClick={() => onCategoryEdit(category.id)} className='flex min-w-12 flex-col items-center gap-1'><span className={'grid size-12 place-items-center overflow-hidden rounded-full border-2 bg-orange-50 ' + (category.id === activeCategory?.id ? 'border-orange-500' : 'border-transparent')}>{cover ? <img src={cover} className='h-full w-full object-cover' /> : <UtensilsCrossed className='size-4 text-orange-400' />}</span><small className='max-w-14 truncate text-[8px]'>{language === 'ar' ? category.name_ar ?? category.name : category.name}</small></button>})}</div>
        <div className='px-4'><div className='mb-2 flex items-end justify-between border-b pb-2'><div><small className='text-[8px] text-slate-400'>{language === 'ar' ? 'تصفح القسم' : 'Browse'}</small><h3 className='text-sm font-extrabold'>{activeCategory ? (language === 'ar' ? activeCategory.name_ar ?? activeCategory.name : activeCategory.name) : '—'}</h3></div><span className='text-[9px] font-bold' style={{ color: accentColor }}>{categoryItems.length} {language === 'ar' ? 'أصناف' : 'items'}</span></div>{categoryItems.map((item, index) => { const image = previewImage(item.image_path); return <button type='button' key={item.id} onClick={() => onItemClick(item.id)} className='relative grid w-full grid-cols-[1fr_72px] gap-2 border-b py-2 text-right'><div><div className='flex gap-1'><span className='rounded-full bg-orange-50 px-1.5 text-[7px] text-orange-600'>{index === 0 ? (language === 'ar' ? 'الأكثر مبيعاً' : 'Popular') : (language === 'ar' ? 'عرض' : 'Offer')}</span><b className='truncate text-[10px]'>{language === 'ar' ? item.name_ar ?? item.name : item.name}</b></div><p className='mt-1 truncate text-[8px] text-slate-400'>{item.description ?? '—'}</p><strong className='text-[10px]' style={{ color: accentColor }}>{item.price.toLocaleString()} د.ع</strong></div><span className='h-[72px] overflow-hidden rounded-xl bg-orange-50'>{image ? <img src={image} className='h-full w-full object-cover' /> : <UtensilsCrossed className='m-6 size-5 text-orange-300' />}</span></button>})}</div>
      </div>
    </div>
  </div>
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
  const { language } = useLanguage()
  const { menuTemplate, accentColor, secondaryColor, gradientAngle, neonLineEnabled, bannerUrls, isOpen } = style
  const restaurantName = useMenuBuilderStore((state) => state.restaurantName)
  const sensors = useSensors(useSensor(PointerSensor))
  const orderedCategories = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order
  )
  const cols = menuTemplate === 'delivery' || menuTemplate === 'delivery-app' || menuTemplate === 'modern' || style.layoutTemplate === 'list-categories' ? 'grid-cols-1' : 'grid-cols-2'
  const previewThemes: Record<MenuTemplateId, { label: string; shell: string }> = {
    aurora: { label: 'أورا', shell: '#311b20' },
    noir: { label: 'نوار', shell: '#101112' },
    souk: { label: 'سوق', shell: '#4a2a20' },
    volt: { label: 'فولت', shell: '#131426' },
    bustan: { label: 'بستان', shell: '#24412f' },
    ivory: { label: 'آيفوري', shell: '#4a4031' },
    neon: { label: 'نيون برو', shell: '#071a20' },
    majesty: { label: 'ماجستي', shell: '#21170c' },
    cafe: { label: 'كافيه', shell: '#4c2f20' },
    market: { label: 'ماركت', shell: '#18254d' },
    modern: { label: 'منيو العصري', shell: '#281d4a' },
    delivery: { label: 'دليفري', shell: '#4b1e15' },
    'delivery-app': { label: 'تطبيقات التوصيل', shell: '#fff7f1' },
  }
  const previewTheme = previewThemes[menuTemplate]

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

  if (menuTemplate === 'delivery-app') {
    return <DeliveryAppPreview categories={orderedCategories} items={items} accentColor={accentColor} bannerUrls={bannerUrls} isOpen={isOpen} restaurantName={restaurantName} language={language} onCategoryEdit={onCategoryEdit} onItemClick={onItemClick} />
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className='relative'>
        {/* إطار الهاتف الوهمي */}
        <div
          className='w-[380px] h-[780px] rounded-[3rem] border-[14px] border-slate-900 shadow-2xl shadow-black/40 bg-black overflow-hidden relative'
          style={{
            '--menu-accent': accentColor,
            background: 'linear-gradient(' + gradientAngle + 'deg, ' + previewTheme.shell + ', ' + secondaryColor + ')',
          } as React.CSSProperties}
        >
          {neonLineEnabled && (
            <>
              <div className='pointer-events-none absolute inset-x-0 top-0 z-30 h-px' style={{ background: 'linear-gradient(90deg, transparent, ' + accentColor + ', ' + secondaryColor + ', transparent)', boxShadow: '0 0 7px ' + accentColor + ', 0 0 14px ' + secondaryColor }} />
              <div className='pointer-events-none absolute inset-x-0 bottom-0 z-30 h-px' style={{ background: 'linear-gradient(90deg, transparent, ' + secondaryColor + ', ' + accentColor + ', transparent)', boxShadow: '0 0 7px ' + accentColor + ', 0 0 14px ' + secondaryColor }} />
            </>
          )}
          {/* شريط حالة الهاتف */}
          <div className='h-10 bg-black flex items-center justify-center border-b border-white/5'>
            <div className='flex items-center gap-1.5 px-4'>
              <div className='h-2 w-1/3 rounded-full bg-slate-600' />
              <div className='h-2 w-1/3 rounded-full bg-slate-600' />
              <div className='h-2 w-1/3 rounded-full bg-slate-600' />
              <div className='ml-auto text-[10px] text-slate-400 font-mono'>12:00</div>
            </div>
          </div>

          {/* رأس القائمة الفاخر (ثابت أعلى محتوى الهاتف) */}
          <div className='absolute top-0 left-0 right-0 z-20'>
            {/* الإضاءة المحيطة */}
            <div
              className='pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 rounded-full blur-3xl opacity-20'
              style={{ background: 'linear-gradient(' + gradientAngle + 'deg, ' + accentColor + ', ' + secondaryColor + ')' }}
            />
            {/* الشريط العلوي الزجاجي */}
            <div className='relative mx-3 mt-2'>
              <div className='flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 border border-white/10 backdrop-blur-md shadow-lg'>
                <div className='flex items-center gap-1.5'>
                  <Button type='button' variant='ghost' size='icon' className='size-7 rounded-lg text-white/90 hover:bg-white/10 border-transparent' aria-label={language === 'ar' ? 'بحث' : 'Search'}>
                    <Search className='size-3.5' />
                  </Button>
                  <Button type='button' variant='ghost' size='icon' className='size-7 rounded-lg text-white/90 hover:bg-white/10 border-transparent' aria-label={language === 'ar' ? 'الموقع' : 'Location'}>
                    <MapPin className='size-3.5' />
                  </Button>
                </div>
                <Button type='button' variant='ghost' size='icon' className='size-7 rounded-lg text-white/90 hover:bg-white/10 border-transparent ml-auto' aria-label={language === 'ar' ? 'القائمة' : 'Menu'}>
                  <Menu className='size-3.5' />
                </Button>
              </div>
            </div>
            <div className='mx-4 mt-2 text-center text-[9px] font-bold tracking-wide text-white/75'>{previewTheme.label}</div>
            {/* البنر الإعلاني */}
            {(bannerUrls || []).length > 0 && (
              <div className='mx-3 mt-2 rounded-2xl overflow-hidden relative aspect-[16/9] shadow-lg'>
                <img src={bannerUrls[0]} alt={language === 'ar' ? 'اللوحة الإعلانية' : 'Promotional banner'} className='w-full h-full object-cover' />
              </div>
            )}
            {/* صف الهوية */}
            <div className='mx-3 mt-2 -mt-8 relative z-20 flex flex-col md:flex-row items-end justify-between gap-3 px-4'>
              <div className='flex items-center gap-2'>
                <span className='w-2 h-2 rounded-full' style={{ backgroundColor: isOpen ? '#22c55e' : '#ef4444' }} />
                <span className='text-xs font-bold' style={{ color: isOpen ? '#22c55e' : '#ef4444' }}>
                  {isOpen ? language === 'ar' ? 'مفتوح' : 'Open' : language === 'ar' ? 'مغلق' : 'Closed'}
                </span>
              </div>
              <div className='flex items-end gap-3'>
                <div className='flex items-center justify-center w-20 h-20 rounded-2xl border-4 shadow-xl overflow-hidden flex-shrink-0 border-white/20 bg-black/40'>
                  <div className='flex w-full h-full items-center justify-center text-white/60'>
                    <UtensilsCrossed className='size-8' />
                  </div>
                </div>
                <div className='flex flex-col items-end text-white'>
                  <h1 className='text-lg font-bold truncate'>{restaurantName ?? (language === 'ar' ? 'المطعم' : 'Restaurant')}</h1>
                </div>
              </div>
            </div>
          </div>

          {/* المحتوى القابل للتمرير */}
          <div className='pt-26 pb-8 overflow-y-auto h-full pr-2'>
            <div className='sticky top-0 z-10 bg-black/70 backdrop-blur-md px-3 py-2 border-b border-white/10 mb-2'>
              <div className='scrollbar-none flex gap-2 overflow-x-auto whitespace-nowrap px-1'>
                {orderedCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type='button'
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      !cat.is_active
                        ? 'border-transparent text-slate-500'
                        : 'border-current text-white bg-white/20 shadow-md'
                    )}
                    style={!cat.is_active ? {} : { borderColor: accentColor }}
                  >
                    {language === 'ar' ? cat.name_ar ?? cat.name : cat.name}
                  </button>
                ))}
              </div>
            </div>
            <SortableContext items={orderedCategories.map((c) => c.id)}>
              <div className='space-y-0'>
                {orderedCategories.length === 0 && (
                  <div className='h-full flex flex-col items-center justify-center text-slate-500 text-sm py-20'>
                    {language === 'ar' ? 'لا توجد أقسام. أضف قسمًا لبدء البناء.' : 'No categories yet. Add one to begin building.'}
                  </div>
                )}
                {orderedCategories.map((cat, index) => (
                  <SortableCategory
                    key={cat.id}
                    item={cat}
                    index={index}
                    accentColor={accentColor}
                    cols={cols}
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
