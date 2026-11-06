import { ContentSection } from '../components/content-section'
import { AppearanceForm } from './appearance-form'

export function SettingsAppearance() {
  return (
    <ContentSection
      title='المظهر'
      desc='تخصيص مظهر التطبيق. التبديل تلقائياً بين أوضاع النهار والليل.'
    >
      <AppearanceForm />
    </ContentSection>
  )
}
