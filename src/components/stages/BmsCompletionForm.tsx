"use client";

import { useActionState } from "react";
import {
  completeBmsSessionAction,
  type CompleteBmsSessionState,
} from "@/actions/stages/completeBmsSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BmsCompletionFormProps = {
  teamId: string;
  disabled?: boolean;
};

const initialState: CompleteBmsSessionState = {};

export function BmsCompletionForm({ teamId, disabled }: BmsCompletionFormProps) {
  const [state, formAction, isPending] = useActionState(
    completeBmsSessionAction,
    initialState
  );

  const isDisabled = disabled || isPending;

  return (
    <section className="rounded-lg border border-zinc-200 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">
        Complete BMS session
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Record the BMS session and unlock Stage 3 portfolio production for this
        team.
      </p>

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="team_id" value={teamId} />

        <div className="space-y-2">
          <Label htmlFor="session_date">BMS session date</Label>
          <Input
            id="session_date"
            name="session_date"
            type="date"
            required
            disabled={isDisabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="remarks">BMS remarks (optional)</Label>
          <textarea
            id="remarks"
            name="remarks"
            rows={3}
            disabled={isDisabled}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="text-sm text-green-700" role="status">
            {state.success}
          </p>
        ) : null}

        <Button type="submit" disabled={isDisabled}>
          {isPending ? "Completing…" : "Complete BMS"}
        </Button>
      </form>
    </section>
  );
}
