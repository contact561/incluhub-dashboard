"use client";

import { useActionState } from "react";
import { saveStudioAvailabilityAction, type SaveAvailabilityState } from "@/actions/studio/saveAvailability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STUDIO_SLOT_CODES, STUDIO_SLOT_LABELS, getTodayInAsiaKolkata } from "@/lib/constants/studioSlots";

export function AssistantAvailabilityForm({ portfolioOutputId }: { portfolioOutputId: string }) {
  const [state, action, pending] = useActionState<SaveAvailabilityState, FormData>(saveStudioAvailabilityAction, {});
  return <section className="mt-4 rounded-[var(--radius-control)] border border-border-default bg-surface-muted p-4">
    <h3 className="font-medium text-text-primary">Share your availability</h3>
    <p className="mt-1 text-sm text-text-muted">Choose the date and all timings that work for you. These are recommendations for the leader and do not reserve the studio.</p>
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="portfolio_output_id" value={portfolioOutputId} />
      <div className="space-y-2">
        <Label htmlFor={`availability-date-${portfolioOutputId}`}>Available date</Label>
        <Input id={`availability-date-${portfolioOutputId}`} name="booking_date" type="date" min={getTodayInAsiaKolkata()} required disabled={pending} className="max-w-xs" />
      </div>
      <details className="rounded-lg border border-border-default bg-surface-card">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-text-primary">Select available timings</summary>
        <div className="grid gap-2 border-t border-border-default p-3 sm:grid-cols-2">
          {STUDIO_SLOT_CODES.map((slot) => <label key={slot} className="flex min-h-11 items-center gap-2 rounded-lg border border-border-default px-3 text-sm">
            <input type="checkbox" name="slot_code" value={slot} disabled={pending} />
            {STUDIO_SLOT_LABELS[slot]}
          </label>)}
        </div>
      </details>
      {state.error ? <p className="text-sm text-destructive" role="alert">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-status-success" role="status">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Share availability"}</Button>
    </form>
  </section>;
}

