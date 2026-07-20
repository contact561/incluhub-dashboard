import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationItem } from "@/types/notification";

type NotificationBellProps = {
  items: NotificationItem[];
  unreadCount: number;
  inboxHref: string;
};

export function NotificationBell({ items, unreadCount, inboxHref }: NotificationBellProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="relative" aria-label={`${unreadCount} unread notifications`} />
        }
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-4 text-sm text-text-muted">No notifications yet.</p>
        ) : (
          items.slice(0, 5).map((item) => (
            <DropdownMenuItem key={item.id} render={<Link href={item.actionUrl ?? inboxHref} />}>
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.title}</span>
                <span className="block line-clamp-2 text-xs text-text-muted">{item.message}</span>
              </span>
              {!item.read ? <span className="ml-auto size-2 rounded-full bg-brand-primary" /> : null}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={inboxHref} />}>
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

