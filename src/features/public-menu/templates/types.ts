export type MenuHeaderStyle = 'banner' | 'minimal' | 'centered' | 'split' | 'cover'
export type MenuTabStyle = 'pills' | 'underline' | 'boxed' | 'minimal'
export type MenuCardLayout =
  | 'grid' // بطاقات شبكية عمودية
  | 'list' // صفوف أفقية مدمجة
  | 'magazine' // صورة كبيرة فوق + نص تحتها، بطاقة واحدة بالعرض الكامل بالتناوب
  | 'overlay' // صورة خلفية مع تدرّج ونص فوقها
export type MenuAnimation =
  | 'none'
  | 'fade-up' // ظهور تدريجي من الأسفل
  | 'shimmer-gold' // بريق ذهبي متحرك (فخم)
  | 'glow-pulse' // توهج نابض حول البطاقات (نيون)
  | 'stagger-scale' // تكبير تدريجي عند الظهور

export interface MenuTemplate {
  id: string
  name: string
  description: string
  /** هل يفرض القالب الوضع الداكن دوماً بغض النظر عن إعداد المطعم؟ */
  forceDark?: boolean
  /** هل يفرض القالب الوضع الفاتح دوماً؟ */
  forceLight?: boolean
  fontFamily: string
  headerStyle: MenuHeaderStyle
  tabStyle: MenuTabStyle
  cardLayout: MenuCardLayout
  animation: MenuAnimation
  /** إضافة زخرفة إطار/فاصل بين الأقسام */
  ornamented?: boolean
  /** ألوان افتراضية مقترحة للمعاينة فقط (المستخدم يبقى قادراً على تغييرها لاحقاً) */
  previewPrimary: string
  previewAccent: string
}
