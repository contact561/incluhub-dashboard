"use client";

import { useActionState } from "react";
import {
  completeBrandWorksAction,
  type CompleteBrandWorksState,
} from "@/actions/stages/completeBrandWorks";
import { Button } from "@/components/ui/button";

type BrandWorksCompletionFormProps = {
  teamId: string;
  canComplete: boolean;
  scheduledDateLabel: string;
};

const initialState: CompleteBrandWorksState = {};

export function BrandWorksCompletionForm({
  teamId,
  canComplete,
  scheduledDateLabel,
}: BrandWorksCompletionFormProps) {
  const [state, formAction, isPending] = useActionState(
    completeBrandWorksAction,
    initialState
  );

  return (
    <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4">
      <h2 className="text-sm font-semibold text-text-primary">
        Complete Brand Works
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        Scheduled for {scheduledDateLabel}. Completion finalizes Stage 4 and
        moves the team to Stage 5 for individual ecosystem review. Students
        are notified to wait for Admin approval before ecosystem access opens.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="team_id" value={teamId} />

        {!canComplete ? (
          <p className="text-sm text-text-muted">
            Completion becomes available on the scheduled date (India time).
          </p>
        ) : null}
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

        <Button type="submit" disabled={!canComplete || isPending}>
          {isPending ? "Completing…" : "Complete Brand Works"}
        </Button>
      </form>
    </section>
  );
}
