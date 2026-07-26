"use client";

import { useActionState } from "react";
import {
  reviewMoodBoardAction,
  type ReviewMoodBoardState,
} from "@/actions/moodboard/reviewMoodBoard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const initialState: ReviewMoodBoardState = {};

export function MoodBoardReviewForm({ submissionId }: { submissionId: string }) {
  const [state, action, pending] = useActionState(
    reviewMoodBoardAction,
    initialState
  );

  return (
    <form action={action} className="mt-3 space-y-3 border-t border-border-default pt-3">
      <input type="hidden" name="submission_id" value={submissionId} />
      <div className="space-y-2">
        <Label htmlFor={`decision-${submissionId}`}>Decision</Label>
        <select
          id={`decision-${submissionId}`}
          name="decision"
          required
          disabled={pending}
          className="flex h-10 w-full max-w-xs rounded-lg border border-input bg-transparent px-3 text-sm"
          defaultValue="approved"
        >
          <option value="approved">Approve</option>
          <option value="revision_required">Revision required</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`comments-${submissionId}`}>Comments</Label>
        <textarea
          id={`comments-${submissionId}`}
          name="comments"
          rows={2}
          disabled={pending}
          placeholder="Required when requesting revision"
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
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
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save review"}
      </Button>
    </form>
  );
}
