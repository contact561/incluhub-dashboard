import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { PageHeader } from "@/components/layout/PageHeader";
import { getNotificationInbox } from "@/lib/data/notifications";

export default async function EducatorNotificationsPage() {
  const data = await getNotificationInbox();
  return <div className="space-y-6">
    <PageHeader title="Notifications" description="Updates for your assigned students and teams." metadata={<span>{data.unreadCount} unread</span>} />
    <NotificationInbox data={data} />
  </div>;
}

