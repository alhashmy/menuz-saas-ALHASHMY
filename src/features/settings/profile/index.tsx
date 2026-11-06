import { ContentSection } from '../components/content-section'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  return (
    <ContentSection
      title='الملف الشخصي'
      desc='هذا كيف سيراك الآخرون على الموقع.'
    >
      <ProfileForm />
    </ContentSection>
  )
}
