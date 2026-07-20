export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  eventType: string;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationInboxData = {
  items: NotificationItem[];
  unreadCount: number;
};

