import Link from "next/link";
import { Bell, Megaphone } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/notifications/markRead";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationInboxData, NotificationItem } from "@/types/notification";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isAdminUpdate(item: NotificationItem) {
  return item.eventType === "admin_update";
}

export function NotificationInbox({ data }: { data: NotificationInboxData }) {
  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <form action={markAllNotificationsReadAction}>
          <Button type="submit" variant="outline" size="sm" disabled={data.unreadCount === 0}>
            Mark all as read
          </Button>
        </form>
      </div>
      {data.items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-6 text-sm text-text-muted">
          Workflow updates and Admin Updates will appear here.
        </div>
      ) : (
        data.items.map((item) => {
          const update = isAdminUpdate(item);
          return (
            <article
              key={item.id}
              className={cn(
                "rounded-[var(--radius-card)] border bg-surface-card p-4",
                item.read
                  ? "border-border-default"
                  : update
                    ? "border-amber-500/50"
                    : "border-brand-primary/40"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                        update
                          ? "bg-amber-500/15 text-amber-700"
                          : "bg-brand-primary/10 text-brand-primary"
                      )}
                      aria-hidden="true"
                    >
                      {update ? <Megaphone className="size-4" /> : <Bell className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                        {update ? "Update" : "Workflow"}
                      </p>
                      <h2 className="font-semibold text-text-primary">{item.title}</h2>
                      <p className="mt-1 text-sm text-text-muted">{item.message}</p>
                      <p className="mt-2 text-xs text-text-subtle">
                        {formatTimestamp(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {item.actionUrl ? (
                    <Link
                      href={item.actionUrl}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Open
                    </Link>
                  ) : null}
                  {!item.read ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="notification_id" value={item.id} />
                      <Button type="submit" size="sm">
                        Mark read
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
