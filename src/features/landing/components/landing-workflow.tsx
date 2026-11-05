import {
  QrCode,
  BookOpenText,
  LayoutGrid,
  Send,
  ChefHat,
  Radar,
  CreditCard,
} from 'lucide-react'

const steps = [
  { title: 'مسح رمز QR', desc: 'يمسح الزبون رمز الطاولة من هاتفه مباشرة.', icon: QrCode },
  { title: 'القائمة الرقمية', desc: 'تفتح القائمة فوراً بدون تطبيق أو تسجيل.', icon: BookOpenText },
  { title: 'تحديد الطاولة', desc: 'يتم ربط الطلب تلقائياً برقم الطاولة.', icon: LayoutGrid },
  { title: 'تقديم الطلب', desc: 'اختيار الأصناف والإضافات ثم إرسال الطلب.', icon: Send },
  { title: 'المطبخ يحضّر', desc: 'يصل الطلب فوراً إلى شاشة المطبخ.', icon: ChefHat },
  { title: 'التتبع المباشر', desc: 'يتابع الزبون حالة طلبه لحظة بلحظة.', icon: Radar },
  { title: 'الدفع', desc: 'إتمام الدفع بسهولة عند الطاولة أو إلكترونياً.', icon: CreditCard },
]

export function LandingWorkflow() {
  return (
    <section className='border-b bg-muted/30'>
      <div className='mx-auto max-w-6xl px-4 py-20 sm:px-6'>
        <div className='mx-auto mb-12 max-w-2xl text-center'>
          <h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>
            كيف تعمل Menuz؟
          </h2>
          <p className='mt-3 text-muted-foreground'>
            رحلة واحدة سلسة من الطاولة إلى الفاتورة، بلا تطبيقات وبلا انتظار.
          </p>
        </div>

        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7'>
          {steps.map((step, idx) => (
            <div
              key={step.title}
              className='group relative flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center shadow-sm transition-shadow hover:shadow-md'
            >
              <span className='absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground'>
                {idx + 1}
              </span>
              <span className='flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
                <step.icon className='size-6' />
              </span>
              <h3 className='text-sm font-semibold'>{step.title}</h3>
              <p className='text-xs text-muted-foreground'>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
