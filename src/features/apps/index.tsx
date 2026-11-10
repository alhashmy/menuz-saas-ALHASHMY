import { useMemo, useState } from 'react'
import { Bot, CheckCircle2, MessageCircleMore, Sparkles, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/i18n'
import { useMenuCategories, useMenuItems } from '@/features/menu/api'
import { cn } from '@/lib/utils'

type AppId = 'whatsapp' | 'ai' | 'delivery'

function getStoredApps() {
  try {
    return JSON.parse(localStorage.getItem('menuz-enabled-apps') ?? '[]') as AppId[]
  } catch {
    return []
  }
}

export function AppsPage() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const { data: categories = [] } = useMenuCategories()
  const { data: items = [] } = useMenuItems()
  const [enabledApps, setEnabledApps] = useState<AppId[]>(getStoredApps)
  const [showInsights, setShowInsights] = useState(false)
  const insights = useMemo(() => {
    const result: string[] = []
    const withoutImages = items.filter((item) => !item.image_path).length
    const withoutArabicNames = items.filter((item) => !item.name_ar?.trim()).length
    const unavailable = items.filter((item) => !item.is_available).length
    if (!categories.length) result.push(language === 'ar' ? 'ابدأ بإضافة أقسام للمنيو حتى يظهر للزبون بشكل منظّم.' : 'Start by adding menu categories so customers can browse clearly.')
    if (items.length && withoutImages) result.push(language === 'ar' ? String(withoutImages) + ' وجبة بلا صورة؛ الصور الجيدة ترفع وضوح الاختيار.' : String(withoutImages) + ' items have no photo; strong imagery makes choices easier.')
    if (language === 'ar' && withoutArabicNames) result.push(String(withoutArabicNames) + ' وجبة بلا اسم عربي؛ أكمل الترجمة للحفاظ على منيو عربي سليم.')
    if (unavailable) result.push(language === 'ar' ? String(unavailable) + ' صنف غير متاح حاليًا؛ راجعه حتى لا يربك فريقك.' : String(unavailable) + ' items are unavailable; review them to keep the menu tidy.')
    if (!result.length) result.push(language === 'ar' ? 'المنيو متوازن من ناحية البنية الأساسية. جرّب إضافة عرض على صنف مميز لزيادة التحويل.' : 'Your menu structure looks healthy. Try featuring an offer on a signature item to drive conversion.')
    return result
  }, [categories.length, items, language])

  function toggleApp(id: AppId) {
    const next = enabledApps.includes(id) ? enabledApps.filter((app) => app !== id) : [...enabledApps, id]
    setEnabledApps(next)
    localStorage.setItem('menuz-enabled-apps', JSON.stringify(next))
    toast.success(language === 'ar' ? 'تم تحديث التطبيق.' : 'App status updated.')
  }

  function handleAppAction(id: AppId) {
    if (id === 'whatsapp') {
      navigate({ to: '/settings/restaurant-ordering' })
      return
    }
    toggleApp(id)
  }

  const apps = [
    { id: 'whatsapp' as const, icon: MessageCircleMore, color: 'text-emerald-500', title: t('apps.whatsapp.title'), description: t('apps.whatsapp.description'), available: true },
    { id: 'ai' as const, icon: Bot, color: 'text-violet-500', title: t('apps.ai.title'), description: t('apps.ai.description'), available: true },
    { id: 'delivery' as const, icon: Truck, color: 'text-sky-500', title: t('apps.delivery.title'), description: t('apps.delivery.description'), available: false },
  ]

  return (
    <>
      <Header />
      <Main>
        <div className='mb-7'>
          <div className='flex size-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600'><Sparkles className='size-5' /></div>
          <h1 className='mt-4 text-2xl font-bold tracking-tight'>{t('apps.title')}</h1>
          <p className='mt-1 text-muted-foreground'>{t('apps.description')}</p>
        </div>
        <div className='grid gap-4 md:grid-cols-3'>
          {apps.map((app) => {
            const active = enabledApps.includes(app.id)
            return (
              <Card key={app.id} className='flex flex-col'>
                <CardHeader>
                  <app.icon className={cn('size-6', app.color)} />
                  <CardTitle className='pt-3'>{app.title}</CardTitle>
                  <CardDescription className='min-h-10'>{app.description}</CardDescription>
                </CardHeader>
                <CardContent className='mt-auto'>
                  {app.available ? <Button variant={active ? 'secondary' : 'default'} className='w-full' onClick={() => handleAppAction(app.id)}>{active && <CheckCircle2 className='size-4' />}{app.id === 'whatsapp' ? t('apps.configure') : active ? t('apps.active') : t('apps.activate')}</Button> : <Button variant='outline' className='w-full' disabled>{t('apps.coming')}</Button>}
                </CardContent>
              </Card>
            )
          })}
        </div>
        <Card className='mt-6 border-violet-500/15'>
          <CardHeader className='flex-row items-start justify-between gap-4'>
            <div><CardTitle className='flex items-center gap-2'><Bot className='size-5 text-violet-500' />{t('apps.ai.title')}</CardTitle><CardDescription className='mt-2'>{language === 'ar' ? 'تحليل عملي للمنيو الحالي من دون إرسال بيانات مطعمك إلى أي خدمة خارجية.' : 'A practical audit of your current menu without sending restaurant data to an external service.'}</CardDescription></div>
            <Button onClick={() => setShowInsights(true)}>{language === 'ar' ? 'حلّل المنيو' : 'Analyse menu'}</Button>
          </CardHeader>
          {showInsights && <CardContent><ul className='space-y-3'>{insights.map((insight) => <li key={insight} className='flex gap-2 rounded-xl bg-muted/55 p-3 text-sm'><Sparkles className='mt-0.5 size-4 shrink-0 text-violet-500' />{insight}</li>)}</ul></CardContent>}
        </Card>
      </Main>
    </>
  )
}
