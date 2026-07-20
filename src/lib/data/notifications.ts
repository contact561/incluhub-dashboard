import { cache } from "react";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import type { NotificationInboxData } from "@/types/notification";

export const getNotificationInbox = cache(async (): Promise<NotificationInboxData> => {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active") {
    return { items: [], unreadCount: 0 };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_recipients")
    .select(`
      notification_id,
      read_status,
      created_at,
      notifications!notification_id (
        title,
        message,
        event_type,
        action_url,
        created_at
      )
    `)
    .eq("recipient_user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[getNotificationInbox]", error.message);
    return { items: [], unreadCount: 0 };
  }

  const items = (data ?? []).flatMap((row) => {
    const notification = row.notifications as unknown as {
      title: string;
      message: string;
      event_type: string;
      action_url: string | null;
      created_at: string;
    } | null;
    return notification
      ? [{
          id: row.notification_id,
          title: notification.title,
          message: notification.message,
          eventType: notification.event_type,
          actionUrl: notification.action_url,
          read: row.read_status,
          createdAt: notification.created_at,
        }]
      : [];
  });

  return {
    items,
    unreadCount: items.filter((item) => !item.read).length,
  };
});
