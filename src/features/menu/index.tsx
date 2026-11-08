import { useCallback, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { getMenuImageUrl } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  SortableContext,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import {
  useDeleteCategory,
  useDeleteMenuItem,
  useMenuCategories,
  useMenuItems,
  useToggleItemAvailability,
  useUpdateSortOrder,
} from './api'
import { CategoryDialog } from './components/category-dialog'
import { ItemDialog } from './components/item-dialog'
import type { MenuCategory, MenuItem } from './types'

function SortableItem({
  item,
  index,
  toggleAvailability,
  setEditingItem,
  setDeleteTarget,
  isReorderMode,
}: {
  item: MenuItem
  index: number
  toggleAvailability: ReturnType<typeof useToggleItemAvailability>
  setEditingItem: (item: MenuItem | null) => void
  setDeleteTarget: (target: { type: 'category' | 'item'; id: string; name: string } | null) => void
  isReorderMode: boolean
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
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'transition-transform duration-200 rounded-lg border bg-card p-3 shadow-sm hover:shadow-md mb-2',
        !isReorderMode
          ? 'cursor-default'
          : 'cursor-grab active:cursor-grabbing',
        !item.is_available && 'opacity-60 grayscale'
      )}
    >
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          {isReorderMode && (
            <div className='shrink-0 text-muted-foreground text-xs font-medium mr-2'>
              ⋮⋮
            </div>
          )}
          <div className='shrink-0 text-muted-foreground text-xs font-medium'>
            {index + 1}
          </div>
          <div className='relative shrink-0 overflow-hidden rounded-md border border-muted/40'>
            {item.image_path ? (
              <img
                src={getMenuImageUrl(item.image_path) ?? ''}
                alt={item.name_ar ?? item.name}
                className='size-10 object-cover object-center'
              />
            ) : (
              <div className='size-10 rounded-md border bg-muted' />
            )}
          </div>
          <div>
            <p className='font-medium truncate'>{item.name_ar ?? item.name}</p>
            <p className='text-xs text-muted-foreground'>
              {item.price.toFixed(2)} د.ع
            </p>
          </div>
        </div>
        {!isReorderMode && (
          <div className='flex items-center gap-2'>
            <Switch
              checked={item.is_available}
              onCheckedChange={(checked) => {
                toggleAvailability.mutate({
                  id: item.id,
                  is_available: checked,
                })
              }}
            />
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded',
                !item.is_available
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              )}
            >
              {item.is_available ? 'متاح' : 'غير متوفر'}
            </span>
            <Button
              size='icon'
              variant='ghost'
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setEditingItem(item)
              }}
            >
              <Edit className='w-4 h-4' />
            </Button>
            <Button
              size='icon'
              variant='ghost'
              onClick={() =>
                setDeleteTarget({
                  type: 'item',
                  id: item.id,
                  name: item.name_ar ?? item.name,
                })
              }
            >
              <Trash2 className='size-4 text-destructive' />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryItems({
  category,
  items,
  sensors,
  updateSortOrder,
  toggleAvailability,
  setEditingItem,
  setDeleteTarget,
  isReorderMode,
}: {
  category: MenuCategory
  items: MenuItem[]
  sensors: ReturnType<typeof useSensors>
  updateSortOrder: ReturnType<typeof useUpdateSortOrder>
  toggleAvailability: ReturnType<typeof useToggleItemAvailability>
  setEditingItem: (item: MenuItem | null) => void
  setDeleteTarget: (target: { type: 'category' | 'item'; id: string; name: string } | null) => void
  isReorderMode: boolean
}) {
  const sortedItems = items
    .filter((item) => item.category_id === category.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeIndex = sortedItems.findIndex((i) => i.id === active.id)
    const overIndex = sortedItems.findIndex((i) => i.id === over.id)

    if (activeIndex === -1 || overIndex === -1) return

    const newItems = arrayMove(sortedItems, activeIndex, overIndex)
    const updates = newItems.map((item, idx) => ({
      id: item.id,
      sort_order: idx,
    }))
    updateSortOrder.mutate(updates)
  }

  if (sortedItems.length === 0) {
    return (
      <p className='p-4 text-sm text-muted-foreground'>
        لا توجد وجبات في هذا القسم بعد.
      </p>
    )
  }

  const reorderUI = isReorderMode ? (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedItems.map((item) => item.id)}>
        <div className='space-y-2'>
          {sortedItems.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              toggleAvailability={toggleAvailability}
              setEditingItem={setEditingItem}
              setDeleteTarget={setDeleteTarget}
              isReorderMode={true}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  ) : (
    <div className='space-y-2'>
      {sortedItems.map((item, index) => (
        <SortableItem
          key={item.id}
          item={item}
          index={index}
          toggleAvailability={toggleAvailability}
          setEditingItem={setEditingItem}
          setDeleteTarget={setDeleteTarget}
          isReorderMode={false}
        />
      ))}
    </div>
  )

  return <>{reorderUI}</>
}

function EditItemDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: MenuItem | null
}) {
  const [name, setName] = useState(item?.name_ar ?? item?.name ?? '')
  const [price, setPrice] = useState(item?.price?.toString() ?? '')

  function handleSave() {
    if (!item) return
    toast.success(`تم تحديث الوجبة: ${name}`)
    onOpenChange(false)
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center'
      aria-hidden={!open}
    >
      <div className='fixed inset-0 bg-black/50 backdrop-blur-sm' onClick={() => onOpenChange(false)} />
      <div className='fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-full max-w-md bg-white rounded-xl border border-gray-200 p-6 shadow-xl z-50'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-bold'>تعديل الوجبة</h3>
          <button
            type='button'
            className='rounded-full p-1 hover:bg-gray-100'
            onClick={() => onOpenChange(false)}
          >
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className='space-y-4'>
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>اسم الوجبة</label>
            <input
              type='text'
              className='w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>السعر (د.ع)</label>
            <input
              type='number'
              step='0.01'
              min='0'
              className='w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className='flex justify-end space-x-2 mt-6'>
            <button
              type='button'
              className='px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md'
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md'
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function MenuManagement() {
  const { data: categories = [], isLoading: loadingCategories } =
    useMenuCategories()
  const { data: allItems = [], isLoading: loadingItems } = useMenuItems()
  const toggleAvailability = useToggleItemAvailability()
  const deleteCategory = useDeleteCategory()
  const deleteItem = useDeleteMenuItem()
  const updateSortOrder = useUpdateSortOrder()

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null
  )

  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<
    { type: 'category' | 'item'; id: string; name: string } | null
  >(null)

  const [isReorderMode, setIsReorderMode] = useState(false)

  const isLoading = loadingCategories || loadingItems
  const sensors = useSensors(useSensor(PointerSensor))

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'category') {
        await deleteCategory.mutateAsync(deleteTarget.id)
      } else {
        await deleteItem.mutateAsync(deleteTarget.id)
      }
      toast.success('تم الحذف بنجاح.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر الحذف.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleToggleReorderMode = useCallback(
    (next: boolean) => {
      setIsReorderMode(next)
    },
    []
  )

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>إدارة القائمة</h1>
            <p className='text-muted-foreground'>
              الأقسام، الوجبات، الأسعار، وحالة التوفر.
            </p>
          </div>
          <div className='flex gap-2 items-center'>
            <Button
              variant='outline'
              size='sm'
              className={cn(
                'flex items-center gap-1.5',
                isReorderMode && 'bg-primary text-primary-foreground'
              )}
              onClick={() => handleToggleReorderMode(!isReorderMode)}
            >
              {isReorderMode ? 'إنهاء التعديل' : 'تعديل الأماكن'}
            </Button>
            <Button
              variant='outline'
              onClick={() => {
                setEditingCategory(null)
                setCategoryDialogOpen(true)
              }}
            >
              <Plus /> قسم جديد
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null)
                setItemDialogOpen(true)
              }}
              disabled={categories.length === 0 || isReorderMode}
            >
              <Plus /> وجبة جديدة
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className='flex h-40 items-center justify-center text-muted-foreground'>
            <Loader2 className='me-2 size-5 animate-spin' /> جارِ التحميل...
          </div>
        ) : categories.length === 0 ? (
          <div className='rounded-lg border border-dashed p-10 text-center text-muted-foreground'>
            لا توجد أقسام بعد. ابدأ بإضافة أول قسم لقائمتك.
          </div>
        ) : (
          <div className='space-y-8'>
            {categories.map((category) => {
              const categoryItems = allItems.filter(
                (item) => item.category_id === category.id
              )
              return (
                <div key={category.id} className='rounded-lg border'>
                  <div className='flex items-center justify-between border-b bg-muted/30 px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <h2 className='font-semibold'>
                        {category.name_ar ?? category.name}
                      </h2>
                      <Badge variant='secondary'>{categoryItems.length} صنف</Badge>
                    </div>
                    <div className='flex gap-1'>
                      <Button
                        size='icon'
                        variant='ghost'
                        disabled={isReorderMode}
                        onClick={() => {
                          setEditingCategory(category)
                          setCategoryDialogOpen(true)
                        }}
                      >
                        <Pencil className='size-4' />
                      </Button>
                      <Button
                        size='icon'
                        variant='ghost'
                        disabled={isReorderMode}
                        onClick={() =>
                          setDeleteTarget({
                            type: 'category',
                            id: category.id,
                            name: category.name_ar ?? category.name,
                          })
                        }
                      >
                        <Trash2 className='size-4 text-destructive' />
                      </Button>
                    </div>
                  </div>
                  <CategoryItems
                    category={category}
                    items={allItems}
                    sensors={sensors}
                    updateSortOrder={updateSortOrder}
                    toggleAvailability={toggleAvailability}
                    setEditingItem={setEditingItem}
                    setDeleteTarget={setDeleteTarget}
                    isReorderMode={isReorderMode}
                  />
                </div>
              )
            })}
          </div>
        )}
      </Main>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />
      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        categories={categories}
        item={editingItem}
      />
      <EditItemDialog
        open={itemToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setItemToEdit(null)
        }}
        item={itemToEdit}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='تأكيد الحذف'
        desc={`هل أنت متأكد من حذف "${deleteTarget?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText='حذف'
        destructive
        handleConfirm={confirmDelete}
      />
    </>
  )
}
