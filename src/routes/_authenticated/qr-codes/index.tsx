import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '@/features/coming-soon'

export const Route = createFileRoute('/_authenticated/qr-codes/')({
  component: () => (
    <ComingSoonPage
      title='أكواد QR'
      description='مكتبة موحّدة لإدارة كل رموز QR (الطاولات، الطاولات الخارجية، اللافتات) قريباً. يمكنك حالياً توليد رموز الطاولات من صفحة الطاولات.'
    />
  ),
})
