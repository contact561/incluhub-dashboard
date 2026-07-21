import { AdminUpdateComposeForm } from "@/components/notifications/AdminUpdateComposeForm";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { PageHeader } from "@/components/layout/PageHeader";
import { getNotificationInbox } from "@/lib/data/notifications";

export default async function AdminNotificationsPage() {
  const data = await getNotificationInbox();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Send Admin Updates and review workflow alerts that need Admin awareness."
        metadata={<span>{data.unreadCount} unread</span>}
      />
      <AdminUpdateComposeForm />
      <NotificationInbox data={data} />
    </div>
  );
}
