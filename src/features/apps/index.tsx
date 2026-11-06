import { ContentSection } from '@/features/settings/components/content-section'
import { Button } from '@/components/ui/button'

export function AppsPage() {
  return (
    <ContentSection
      title='التطبيقات'
      desc='إدارة التطبيقات الإضافية وربط الخدمات الخارجية بمطعمك.'
    >
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {[
          {
            id: 'whatsapp',
            title: 'واتساب للأعمال',
            desc: 'ربط حساب واتساب لمطعمك لإرسال واستقبال الطلبات.',
            icon: '📱',
          },
          {
            id: 'ai-assistant',
            title: 'المساعد الذكي',
            desc: 'استخدام الذكاء الاصطناعي لتحليل المبيعات واقتراح تحسينات.',
            icon: '🤖',
          },
          {
            id: 'delivery',
            title: 'التوصيل الخارجي',
            desc: 'ربط خدمات التوصيل बाह externa مع نظام المطعم.',
            icon: '🚚',
          },
        ].map((app) => (
          <div
            key={app.id}
            className='flex flex-col gap-2 rounded-lg border bg-card p-6 shadow-sm'
          >
            <div className='text-2xl'>{app.icon}</div>
            <h3 className='font-semibold'>{app.title}</h3>
            <p className='text-sm text-muted-foreground'>{app.desc}</p>
            <Button variant='outline' size='sm' className='mt-2'>
              ربط التطبيق
            </Button>
          </div>
        ))}
      </div>
    </ContentSection>
  )
}
