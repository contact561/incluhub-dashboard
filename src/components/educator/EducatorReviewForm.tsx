"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  addEducatorWorkflowCommentAction,
  type WorkflowCommentState,
} from "@/actions/portfolio/comments";
import { StatusPanel } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EducatorReviewForm({
  teamId,
  portfolioOutputId,
  moodboardSubmissionId,
  portfolioSubmissionId,
}: {
  teamId: string;
  portfolioOutputId: string;
  moodboardSubmissionId: string | null;
  portfolioSubmissionId: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    WorkflowCommentState,
    FormData
  >(addEducatorWorkflowCommentAction, {});

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="team_id" value={teamId} />
      <input
        type="hidden"
        name="portfolio_output_id"
        value={portfolioOutputId}
      />
      <input
        type="hidden"
        name="moodboard_submission_id"
        value={moodboardSubmissionId ?? ""}
      />
      <input
        type="hidden"
        name="portfolio_submission_id"
        value={portfolioSubmissionId ?? ""}
      />
      <div className="space-y-2">
        <Label htmlFor="educator-comment">Monitoring comment</Label>
        <Textarea
          id="educator-comment"
          name="body"
          rows={5}
          minLength={1}
          maxLength={2000}
          required
          disabled={pending}
          placeholder="Add an observation, suggestion or progress note. This does not approve or block the workflow."
        />
        <p className="text-xs text-text-subtle">
          Visible to the assigned team and IncluHub Admin.
        </p>
      </div>
      {state.error ? (
        <StatusPanel
          variant="danger"
          title="Comment not posted"
          description={state.error}
        />
      ) : null}
      {state.success ? (
        <StatusPanel
          variant="success"
          title="Comment posted"
          description={state.success}
        />
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Posting…" : "Post monitoring comment"}
      </Button>
    </form>
  );
}
