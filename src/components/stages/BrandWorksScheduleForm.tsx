"use client";

import { useActionState, useState } from "react";
import {
  scheduleBrandWorksAction,
  type ScheduleBrandWorksState,
} from "@/actions/stages/scheduleBrandWorks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BrandWorksScheduleFormProps = {
  teamId: string;
  existingDate: string | null;
  existingRemarks: string | null;
};

const initialState: ScheduleBrandWorksState = {};

export function BrandWorksScheduleForm({
  teamId,
  existingDate,
  existingRemarks,
}: BrandWorksScheduleFormProps) {
  const [date, setDate] = useState(existingDate ?? "");
  const [remarks, setRemarks] = useState(existingRemarks ?? "");
  const [state, formAction, isPending] = useActionState(
    scheduleBrandWorksAction,
    initialState
  );

  return (
    <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4">
      <h2 className="text-sm font-semibold text-text-primary">
        {existingDate ? "Reschedule Brand Works" : "Schedule Brand Works"}
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        Set the team&apos;s Brand Works date and optional instructions. Students
        and assigned educators can view this schedule but cannot change it.
      </p>

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="team_id" value={teamId} />

        <div className="space-y-2">
          <Label htmlFor="brand_works_date">Brand Works date</Label>
          <Input
            id="brand_works_date"
            name="brand_works_date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand_works_remarks">Remarks (optional)</Label>
          <textarea
            id="brand_works_remarks"
            name="remarks"
            rows={4}
            maxLength={2000}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-text-subtle">Maximum 2000 characters.</p>
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

        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving…"
            : existingDate
              ? "Save new schedule"
              : "Schedule Brand Works"}
        </Button>
      </form>
    </section>
  );
}
