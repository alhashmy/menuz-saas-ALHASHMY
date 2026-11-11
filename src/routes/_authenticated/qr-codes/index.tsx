import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/qr-codes/')({
  // رابط قديم متوافق مع الروابط المطبوعة؛ الواجهة الوحيدة أصبحت /tables.
  beforeLoad: () => {
    throw redirect({ to: '/tables' })
  },
})
