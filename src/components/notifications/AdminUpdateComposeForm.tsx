"use client";

import { useActionState } from "react";
import {
  sendAdminUpdateAction,
  type SendAdminUpdateState,
} from "@/actions/notifications/sendAdminUpdate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SendAdminUpdateState = {};

export function AdminUpdateComposeForm() {
  const [state, action, pending] = useActionState(
    sendAdminUpdateAction,
    initialState
  );

  return (
    <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4">
      <h2 className="font-semibold text-text-primary">Send an Update</h2>
      <p className="mt-1 text-sm text-text-muted">
        Broadcast an Admin Update to one audience. Updates appear in the same
        inbox as workflow alerts, with a distinct Update style.
      </p>
      <form action={action} className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="admin-update-audience">Audience</Label>
          <select
            id="admin-update-audience"
            name="audience"
            required
            disabled={pending}
            defaultValue="all_students"
            className="flex h-10 w-full max-w-md rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="all_students">All students only</option>
            <option value="all_educators">All educators only</option>
            <option value="everyone">Everyone (students, educators, admins)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-update-title">Title</Label>
          <Input
            id="admin-update-title"
            name="title"
            required
            minLength={3}
            maxLength={200}
            disabled={pending}
            placeholder="Short update title"
            className="max-w-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-update-message">Message</Label>
          <textarea
            id="admin-update-message"
            name="message"
            required
            minLength={3}
            maxLength={2000}
            rows={4}
            disabled={pending}
            placeholder="What should recipients know?"
            className="w-full max-w-xl rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-status-success" role="status">
            {state.success}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send Update"}
        </Button>
      </form>
    </section>
  );
}
