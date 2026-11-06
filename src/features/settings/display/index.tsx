import { ContentSection } from '../components/content-section'
import { DisplayForm } from './display-form'

export function SettingsDisplay() {
  return (
    <ContentSection
      title='العرض'
      desc='تشغيل أو إيقاف العناصر للتحكم في ما يظهر في التطبيق.'
    >
      <DisplayForm />
    </ContentSection>
  )
}
