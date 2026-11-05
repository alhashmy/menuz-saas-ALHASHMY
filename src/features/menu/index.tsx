import { useState } from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getMenuImageUrl } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  useDeleteCategory,
  useDeleteMenuItem,
  useMenuCategories,
  useMenuItems,
  useToggleItemAvailability,
} from './api'
import { CategoryDialog } from './components/category-dialog'
import { ItemDialog } from './components/item-dialog'
import type { MenuCategory, MenuItem } from './types'

export function MenuManagement() {
  const { data: categories = [], isLoading: loadingCategories } = useMenuCategories()
  const { data: items = [], isLoading: loadingItems } = useMenuItems()
  const toggleAvailability = useToggleItemAvailability()
  const deleteCategory = useDeleteCategory()
  const deleteItem = useDeleteMenuItem()

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)

  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<
    { type: 'category' | 'item'; id: string; name: string } | null
  >(null)

  const isLoading = loadingCategories || loadingItems

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
          <div className='flex gap-2'>
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
              disabled={categories.length === 0}
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
              const categoryItems = items.filter(
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

                  {categoryItems.length === 0 ? (
                    <p className='p-4 text-sm text-muted-foreground'>
                      لا توجد وجبات في هذا القسم بعد.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className='w-14'></TableHead>
                          <TableHead>الاسم</TableHead>
                          <TableHead>السعر</TableHead>
                          <TableHead>متاح؟</TableHead>
                          <TableHead className='text-left'>إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {item.image_path ? (
                                <img
                                  src={getMenuImageUrl(item.image_path) ?? ''}
                                  alt={item.name_ar ?? item.name}
                                  className='size-10 rounded-md border object-cover'
                                />
                              ) : (
                                <div className='size-10 rounded-md border bg-muted' />
                              )}
                            </TableCell>
                            <TableCell className='font-medium'>
                              {item.name_ar ?? item.name}
                            </TableCell>
                            <TableCell>{item.price.toFixed(2)}</TableCell>
                            <TableCell>
                              <Switch
                                checked={item.is_available}
                                onCheckedChange={(checked) =>
                                  toggleAvailability.mutate({
                                    id: item.id,
                                    is_available: checked,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell className='flex justify-end gap-1'>
                              <Button
                                size='icon'
                                variant='ghost'
                                onClick={() => {
                                  setEditingItem(item)
                                  setItemDialogOpen(true)
                                }}
                              >
                                <Pencil className='size-4' />
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
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
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
