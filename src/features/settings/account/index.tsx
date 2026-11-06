import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  return (
    <ContentSection
      title='الحساب'
      desc='تحديث إعدادات الحساب. تعيين اللغة والمنطقة الزمنية المفضلة لديك.'
    >
      <AccountForm />
    </ContentSection>
  )
}
