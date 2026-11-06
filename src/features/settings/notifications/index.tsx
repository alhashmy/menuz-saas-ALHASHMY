import { ContentSection } from '../components/content-section'
import { NotificationsForm } from './notifications-form'

export function SettingsNotifications() {
  return (
    <ContentSection
      title='الإشعارات'
      desc='تكوين كيفية تلقي الإشعارات.'
    >
      <NotificationsForm />
    </ContentSection>
  )
}
