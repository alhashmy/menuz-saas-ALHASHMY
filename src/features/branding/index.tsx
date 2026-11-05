import { useEffect, useState } from 'react'
import { Loader2, Save, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { getMenuImageUrl, uploadMenuImage } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/header'
import { Label } from '@/components/ui/label'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ThemeSwitch } from '@/components/theme-switch'
import { useRestaurantBranding, useUpdateBranding } from './api'
import { ColorField } from './components/color-field'
import { MenuLinkCard } from './components/menu-link-card'
import { MenuPreview } from './components/menu-preview'
import { TemplatePicker } from './components/template-picker'

export function BrandingManagement() {
  const { data: branding, isLoading } = useRestaurantBranding()
  const updateBranding = useUpdateBranding()
  const restaurant = useAuthStore((s) => s.restaurant)
  const restaurantId = restaurant?.id

  const [primaryColor, setPrimaryColor] = useState('#0ea5e9')
  const [accentColor, setAccentColor] = useState('#f97316')
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('dark')
  const [menuStyle, setMenuStyle] = useState<string>('classic-grid')
  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  useEffect(() => {
    if (branding) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- تهيئة حقول النموذج من بيانات الهوية البصرية بعد جلبها
      setPrimaryColor(branding.primary_color)
      setAccentColor(branding.accent_color)
      setThemeMode(branding.theme_mode)
      setMenuStyle(branding.menu_style)
      setLogoPath(branding.logo_path)
    }
  }, [branding])

  async function handleSave() {
    try {
      let finalLogoPath = logoPath
      if (logoFile && restaurantId) {
        finalLogoPath = await uploadMenuImage(restaurantId, 'branding', logoFile)
        setLogoFile(null)
      }

      await updateBranding.mutateAsync({
        primary_color: primaryColor,
        accent_color: accentColor,
        theme_mode: themeMode,
        menu_style: menuStyle,
        logo_path: finalLogoPath,
      })
      toast.success('تم حفظ الهوية البصرية.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر الحفظ.')
    }
  }

  const logoPreviewUrl = logoFile
    ? URL.createObjectURL(logoFile)
    : getMenuImageUrl(logoPath)

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold tracking-tight'>الهوية البصرية</h1>
          <p className='text-muted-foreground'>
            خصّص ألوان ونمط قائمتك الرقمية كما يراها الزبائن.
          </p>
        </div>

        {isLoading ? (
          <div className='flex h-40 items-center justify-center text-muted-foreground'>
            <Loader2 className='me-2 size-5 animate-spin' /> جارِ التحميل...
          </div>
        ) : (
          <div className='grid gap-6 lg:grid-cols-5'>
            {restaurant?.slug && (
              <div className='lg:col-span-5'>
                <MenuLinkCard slug={restaurant.slug} />
              </div>
            )}

            <Card className='lg:col-span-3'>
              <CardHeader>
                <CardTitle>الإعدادات</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-6'>
                <div className='grid gap-2'>
                  <Label>شعار المطعم</Label>
                  <div className='flex items-center gap-4'>
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt='الشعار'
                        className='size-16 rounded-full border object-cover'
                      />
                    ) : (
                      <div className='size-16 rounded-full border bg-muted' />
                    )}
                    <label className='flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted'>
                      <Upload className='size-4' />
                      رفع شعار جديد
                      <input
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <ColorField
                    label='اللون الأساسي (Primary)'
                    value={primaryColor}
                    onChange={setPrimaryColor}
                  />
                  <ColorField
                    label='اللون الثانوي (Accent)'
                    value={accentColor}
                    onChange={setAccentColor}
                  />
                </div>

                <div className='grid gap-2 sm:w-1/2'>
                  <Label>وضع الثيم الافتراضي</Label>
                  <Select
                    value={themeMode}
                    onValueChange={(v) => setThemeMode(v as typeof themeMode)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='dark'>داكن</SelectItem>
                      <SelectItem value='light'>فاتح</SelectItem>
                      <SelectItem value='system'>حسب الجهاز</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='text-xs text-muted-foreground'>
                    بعض القوالب أدناه تفرض وضعاً داكناً أو فاتحاً دائماً بغض النظر عن هذا الإعداد.
                  </p>
                </div>

                <Button
                  className='w-fit'
                  onClick={handleSave}
                  disabled={updateBranding.isPending}
                >
                  {updateBranding.isPending && <Loader2 className='animate-spin' />}
                  <Save className='size-4' /> حفظ التغييرات
                </Button>
              </CardContent>
            </Card>

            <div className='lg:col-span-2'>
              <p className='mb-2 text-sm font-medium text-muted-foreground'>
                معاينة مباشرة
              </p>
              <div className='lg:sticky lg:top-20'>
                <MenuPreview
                  restaurantName={restaurant?.name ?? ''}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                  themeModeOverride={themeMode}
                  templateId={menuStyle}
                  logoUrl={logoPreviewUrl}
                />
              </div>
            </div>

            <Card className='lg:col-span-5'>
              <CardHeader>
                <CardTitle>قالب القائمة</CardTitle>
                <p className='text-sm text-muted-foreground'>
                  اختر أحد القوالب الجاهزة العشرة؛ بعضها يحمل تأثيرات حركة (
                  <span className='inline-flex items-center gap-1'>
                    <Sparkles className='size-3.5' /> فخم
                  </span>
                  ) مناسبة للمطاعم الراقية.
                </p>
              </CardHeader>
              <CardContent>
                <TemplatePicker value={menuStyle} onChange={setMenuStyle} />
              </CardContent>
            </Card>
          </div>
        )}
      </Main>
    </>
  )
}
