import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getCookie, setCookie } from '@/lib/cookies'

export type AppLanguage = 'ar' | 'en'

const LANGUAGE_COOKIE = 'menuz-language'
const LANGUAGE_MAX_AGE = 60 * 60 * 24 * 365

const messages = {
  ar: {
    'app.name': 'Menuz',
    'app.tagline': 'نظام تشغيل المطاعم',
    'nav.workspace': 'مساحة العمل',
    'nav.dashboard': 'نظرة عامة',
    'nav.orders': 'الطلبات',
    'nav.tables': 'الطاولات و QR',
    'nav.menu': 'إدارة الأطباق',
    'nav.builder': 'صانع المنيو',
    'nav.offers': 'العروض',
    'nav.restaurant': 'المطعم',
    'nav.staff': 'الفريق',
    'nav.analytics': 'التحليلات',
    'nav.apps': 'التطبيقات والذكاء',
    'nav.settings': 'الإعدادات',
    'nav.orderSettings': 'إعدادات الطلبات',
    'nav.support': 'التواصل والدعم الفني',
    'language.switch': 'English',
    'language.current': 'العربية',
    'common.preview': 'معاينة',
    'common.save': 'حفظ',
    'common.publish': 'نشر التغييرات',
    'common.cancel': 'إلغاء',
    'common.add': 'إضافة',
    'common.open': 'مفتوح',
    'common.closed': 'مغلق',
    'common.loading': 'جارٍ التحميل…',
    'qr.title': 'مركز أكواد QR',
    'qr.description':
      'أنشئ رموزًا جاهزة للطباعة لكل طاولة أو نقطة دخول إلى منيو مطعمك.',
    'qr.newTable': 'طاولة جديدة',
    'apps.title': 'التطبيقات والذكاء',
    'apps.description':
      'فعّل الأدوات التي تساعدك على استقبال الطلبات وتحسين المنيو.',
    'apps.active': 'مفعّل',
    'apps.activate': 'تفعيل',
    'apps.configure': 'إعداد الربط',
    'apps.coming': 'قريبًا',
    'apps.whatsapp.title': 'واتساب للأعمال',
    'apps.whatsapp.description': 'أرسل نسخة منظمة من الطلب إلى واتساب المطعم.',
    'apps.ai.title': 'مساعد المنيو الذكي',
    'apps.ai.description':
      'اقتراحات عملية لتحسين تسميات المنيو والأسعار والعروض.',
    'apps.delivery.title': 'بوابة التوصيل',
    'apps.delivery.description':
      'جهّز منيوك للربط مع شركات التوصيل عند توفر التكامل.',
  },
  en: {
    'app.name': 'Menuz',
    'app.tagline': 'Restaurant operating system',
    'nav.workspace': 'Workspace',
    'nav.dashboard': 'Overview',
    'nav.orders': 'Orders',
    'nav.tables': 'Tables & QR',
    'nav.menu': 'Dish management',
    'nav.builder': 'Menu builder',
    'nav.offers': 'Offers',
    'nav.restaurant': 'Restaurant',
    'nav.staff': 'Team',
    'nav.analytics': 'Analytics',
    'nav.apps': 'Apps & intelligence',
    'nav.settings': 'Settings',
    'nav.orderSettings': 'Ordering settings',
    'nav.support': 'Support & Communication',
    'language.switch': 'العربية',
    'language.current': 'English',
    'common.preview': 'Preview',
    'common.save': 'Save',
    'common.publish': 'Publish changes',
    'common.cancel': 'Cancel',
    'common.add': 'Add',
    'common.open': 'Open',
    'common.closed': 'Closed',
    'common.loading': 'Loading…',
    'qr.title': 'QR centre',
    'qr.description':
      'Create print-ready QR codes for every table and menu entry point.',
    'qr.newTable': 'New table',
    'apps.title': 'Apps & intelligence',
    'apps.description':
      'Enable tools that help you capture orders and improve your menu.',
    'apps.active': 'Active',
    'apps.activate': 'Activate',
    'apps.configure': 'Configure',
    'apps.coming': 'Coming soon',
    'apps.whatsapp.title': 'WhatsApp Business',
    'apps.whatsapp.description':
      'Send a structured copy of each order to the restaurant WhatsApp.',
    'apps.ai.title': 'Smart menu assistant',
    'apps.ai.description':
      'Practical suggestions to improve menu names, prices, and offers.',
    'apps.delivery.title': 'Delivery gateway',
    'apps.delivery.description':
      'Prepare your menu for delivery partners when an integration is available.',
  },
} as const

type TranslationKey = keyof (typeof messages)['ar']

type LanguageContextValue = {
  language: AppLanguage
  direction: 'rtl' | 'ltr'
  setLanguage: (language: AppLanguage) => void
  toggleLanguage: () => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function initialLanguage(): AppLanguage {
  const saved = getCookie(LANGUAGE_COOKIE)
  if (saved === 'ar' || saved === 'en') return saved
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(initialLanguage)
  const direction = language === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = direction
  }, [direction, language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      direction,
      setLanguage: (nextLanguage) => {
        setLanguageState(nextLanguage)
        setCookie(LANGUAGE_COOKIE, nextLanguage, LANGUAGE_MAX_AGE)
      },
      toggleLanguage: () => {
        const nextLanguage = language === 'ar' ? 'en' : 'ar'
        setLanguageState(nextLanguage)
        setCookie(LANGUAGE_COOKIE, nextLanguage, LANGUAGE_MAX_AGE)
      },
      t: (key) => messages[language][key],
    }),
    [direction, language]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context)
    throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
