import { useCallback, useState } from 'react'
import { Loader2, Pencil, Plus, Trash2, Edit, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
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
  useUpsertMenuItem,
} from './api'
import { CategoryDialog } from './components/category-dialog'
import { ItemDialog } from './components/item-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { MenuCategory, MenuItem } from './types'

function SortableItem({
  item,
  index,
  toggleAvailability,
  setItemToEdit,
  setDeleteTarget,
  isEditModeEnabled,
  isReorderMode,
}: {
  item: MenuItem
  index: number
  toggleAvailability: ReturnType<typeof useToggleItemAvailability>
  setItemToEdit: (item: MenuItem | null) => void
  setDeleteTarget: (target: { type: 'category' | 'item'; id: string; name: string } | null) => void
  isEditModeEnabled: boolean
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
            <img
              src={item.image_path || 'رابط_صورة_افتراضية_أو_فارغ'}
              alt={item.name}
              className='size-10 object-cover object-center'
            />
          </div>
          <div>
            <p className='font-medium truncate'>{item.name_ar ?? item.name}</p>
            <p className='text-xs text-muted-foreground'>
              {item.price.toFixed(2)} د.ع
            </p>
          </div>
        </div>
        {(isEditModeEnabled || isReorderMode) && (
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
                setItemToEdit(item)
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
  setItemToEdit,
  setDeleteTarget,
  isEditModeEnabled,
  isReorderMode,
}: {
  category: MenuCategory
  items: MenuItem[]
  sensors: ReturnType<typeof useSensors>
  updateSortOrder: ReturnType<typeof useUpdateSortOrder>
  toggleAvailability: ReturnType<typeof useToggleItemAvailability>
  setItemToEdit: (item: MenuItem | null) => void
  setDeleteTarget: (target: { type: 'category' | 'item'; id: string; name: string } | null) => void
  isEditModeEnabled: boolean
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
              setItemToEdit={setItemToEdit}
              setDeleteTarget={setDeleteTarget}
              isEditModeEnabled={isEditModeEnabled}
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
          setItemToEdit={setItemToEdit}
          setDeleteTarget={setDeleteTarget}
          isEditModeEnabled={isEditModeEnabled}
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
  const upsertMenuItem = useUpsertMenuItem()
  const queryClient = useQueryClient()
  const restaurantId = useAuthStore((s) => s.restaurant?.id)

  const [nameAr, setNameAr] = useState(item?.name_ar ?? '')
  const [price, setPrice] = useState(item?.price?.toString() ?? '')
  const [description, setDescription] = useState(item?.description || '')
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleSave = async () => {
    try {
      let finalImageUrl = item?.image_path || ''; // الاحتفاظ بالصورة القديمة

      if (imageFile) {
        // 1. توليد اسم إنجليزي عشوائي وآمن إجبارياً لمنع أخطاء الأسماء العربية
        const fileExt = imageFile.name.split('.').pop();
        const safeFileName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        
        // 2. الرفع إلى Supabase
        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(safeFileName, imageFile);
          
        if (uploadError) {
          alert("فشل الرفع إلى الخادم: " + uploadError.message); // تنبيه للمستخدم
          return;
        }

        // 3. بناء الرابط الكامل (Absolute URL) يدوياً لمنع أخطاء المتصفح
        const SUPABASE_PROJECT_URL = 'https://fcwxelswjoiwndlzqhys.supabase.co';
        finalImageUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/menu-images/${safeFileName}`;
      }

      // 4. تحديث قاعدة البيانات
      const { data, error: dbError } = await supabase
        .from('menu_items') // تأكد من أن اسم الجدول صحيح
        .update({
          name: nameAr,
          price: price,
          description: description,
          image_path: finalImageUrl
        })
        .eq('id', item?.id)
        .select();

      if (dbError) {
        alert("فشل تحديث البيانات: " + dbError.message);
        return;
      }

      if (!data || data.length === 0) {
        alert("تحذير: لم يتم تعديل أي صف! قد يكون هناك حظر RLS يمنع الـ UPDATE على جدول menu_items.");
        return;
      }

      // 5. التنظيف والإغلاق
      setImageFile(null);
      onOpenChange(false);

      alert("تم التحديث بنجاح!");
      queryClient.invalidateQueries({ queryKey: ['menu-items', restaurantId] })

    } catch (_error) {
      alert("حدث خطأ غير متوقع!");
    }
  }

  return (
        <Dialog open={open} onOpenChange={(open) => {
          if (!open) setImageFile(null)
          onOpenChange(open)
        }}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>تعديل الوجبة</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className='space-y-6'>
          <div className='space-y-2'>
            <Label>اسم الوجبة (عربي)</Label>
            <Input
              type='text'
              placeholder='اسم الوجبة بالعربية'
              defaultValue={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              required
            />
          </div>
          <div className='space-y-2'>
            <Label>السعر (د.ع)</Label>
            <Input
              type='number'
              step='0.01'
              min='0'
              placeholder='0.00'
              defaultValue={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className='space-y-2'>
            <Label>الوصف (عربي)</Label>
            <Textarea
              placeholder='وصف الوجبة بالعربية'
              defaultValue={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className='space-y-2'>
            <Label>صورة الوجبة</Label>
            <Input
              type='file'
              accept='image/*'
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className='flex justify-end space-x-2 mt-6'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={upsertMenuItem.isPending}
            >
              إلغاء
            </Button>
            <Button
              type='submit'
              disabled={upsertMenuItem.isPending}
            >
              {upsertMenuItem.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
  const [isEditModeEnabled, setIsEditModeEnabled] = useState(false)

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='flex items-center gap-1.5'>
                  <Settings className='size-4' />
                  إعدادات القائمة
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleToggleReorderMode(!isReorderMode)}>
                  تعديل الأماكن
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setEditingCategory(null)
                  setCategoryDialogOpen(true)
                }}>
                  إدارة الأصناف
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsEditModeEnabled(!isEditModeEnabled)}>
                  تفعيل وضع التعديل للوجبات
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                    setItemToEdit={setItemToEdit}
                    setDeleteTarget={setDeleteTarget}
                    isEditModeEnabled={isEditModeEnabled}
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
        key={itemToEdit?.id}
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
