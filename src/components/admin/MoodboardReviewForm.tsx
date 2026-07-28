"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  reviewMoodboardAsAdminAction,
  type MoodboardActionState,
} from "@/actions/portfolio/moodboards";
import { StatusPanel } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MoodboardReviewForm({
  submissionId,
}: {
  submissionId: string;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approved" | "revision_required">(
    "approved"
  );
  const [state, action, pending] = useActionState<
    MoodboardActionState,
    FormData
  >(reviewMoodboardAsAdminAction, {});

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form action={action} className="space-y-3">
      <input
        type="hidden"
        name="moodboard_submission_id"
        value={submissionId}
      />
      <input type="hidden" name="decision" value={decision} />
      <div className="flex flex-wrap gap-4 text-sm text-text-primary">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={decision === "approved"}
            onChange={() => setDecision("approved")}
            disabled={pending}
          />
          Approve
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={decision === "revision_required"}
            onChange={() => setDecision("revision_required")}
            disabled={pending}
          />
          Request revision
        </label>
      </div>
      <Textarea
        name="comments"
        rows={3}
        maxLength={2000}
        required={decision === "revision_required"}
        disabled={pending}
        placeholder={
          decision === "revision_required"
            ? "Explain what must change"
            : "Optional Admin note"
        }
      />
      {state.error ? (
        <StatusPanel
          variant="danger"
          title="Decision not saved"
          description={state.error}
        />
      ) : null}
      {state.success ? (
        <StatusPanel
          variant="success"
          title="Decision saved"
          description={state.success}
        />
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending
          ? "Saving…"
          : decision === "approved"
            ? "Approve moodboard"
            : "Request revision"}
      </Button>
    </form>
  );
}
