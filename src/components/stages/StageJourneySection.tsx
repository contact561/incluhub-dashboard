"use client";

import { useActionState } from "react";
import {
  startTeamStageJourneyAction,
  type StartTeamStageJourneyState,
} from "@/actions/stages/startTeamStageJourney";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status/StatusBadge";
import {
  TEAM_JOURNEY_STATE_LABELS,
  type TeamJourneyAssessment,
} from "@/lib/stages/teamJourneyReadiness";

type StageJourneySectionProps = {
  teamId: string;
  assessment: TeamJourneyAssessment;
};

const initialState: StartTeamStageJourneyState = {};

export function StageJourneySection({
  teamId,
  assessment,
}: StageJourneySectionProps) {
  const [state, formAction, isPending] = useActionState(
    startTeamStageJourneyAction,
    initialState
  );

  return (
    <section className="rounded-lg border border-zinc-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Stage journey</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Enroll the team into the shared stage workflow after setup is
            complete.
          </p>
        </div>
        <StatusBadge status={assessment.state} />
      </div>

      <p className="mt-3 text-sm text-zinc-700">
        {TEAM_JOURNEY_STATE_LABELS[assessment.state]}
      </p>

      {assessment.issues.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {assessment.issues.map((issue) => (
            <li key={issue} className="text-sm text-destructive">
              {issue}
            </li>
          ))}
        </ul>
      ) : null}

      {assessment.canEnroll && assessment.buttonLabel ? (
        <form action={formAction} className="mt-4">
          <input type="hidden" name="team_id" value={teamId} />

          {state.error ? (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          {state.success ? (
            <p className="mb-3 text-sm text-green-700" role="status">
              {state.success}
            </p>
          ) : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Starting…" : assessment.buttonLabel}
          </Button>
        </form>
      ) : null}

      {!assessment.canEnroll && assessment.state === "in_progress" ? (
        <p className="mt-3 text-xs text-zinc-500">
          This team is enrolled in the stage journey. Use the timeline below to
          track progress.
        </p>
      ) : null}
    </section>
  );
}
