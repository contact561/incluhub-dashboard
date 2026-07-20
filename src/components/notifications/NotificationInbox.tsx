import Link from "next/link";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/actions/notifications/markRead";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationInboxData } from "@/types/notification";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function NotificationInbox({ data }: { data: NotificationInboxData }) {
  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <form action={markAllNotificationsReadAction}>
          <Button type="submit" variant="outline" size="sm" disabled={data.unreadCount === 0}>Mark all as read</Button>
        </form>
      </div>
      {data.items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-6 text-sm text-text-muted">Workflow updates will appear here.</div>
      ) : data.items.map((item) => (
        <article key={item.id} className={cn("rounded-[var(--radius-card)] border bg-surface-card p-4", item.read ? "border-border-default" : "border-brand-primary/40")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-text-primary">{item.title}</h2>
              <p className="mt-1 text-sm text-text-muted">{item.message}</p>
              <p className="mt-2 text-xs text-text-subtle">{formatTimestamp(item.createdAt)}</p>
            </div>
            <div className="flex gap-2">
              {item.actionUrl ? <Link href={item.actionUrl} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Open</Link> : null}
              {!item.read ? (
                <form action={markNotificationReadAction}>
                  <input type="hidden" name="notification_id" value={item.id} />
                  <Button type="submit" size="sm">Mark read</Button>
                </form>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

