"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  reviewPortfolioAsEducatorAction,
  type ReviewPortfolioAsEducatorState,
} from "@/actions/portfolio/reviewPortfolioAsEducator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EducatorReviewFormProps = {
  portfolioOutputId: string;
  submissionId: string;
};

const initialState: ReviewPortfolioAsEducatorState = {};

export function EducatorReviewForm({
  portfolioOutputId,
  submissionId,
}: EducatorReviewFormProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approved" | "revision_required">(
    "approved"
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    reviewPortfolioAsEducatorAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">Your decision</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Approve to send this portfolio to Admin review, or request a revision
        with clear feedback for the portfolio leader.
      </p>

      <form
        action={formAction}
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          setClientError(null);
          if (decision === "approved") {
            const confirmed = window.confirm(
              "Approve this portfolio and send it to Admin review?"
            );
            if (!confirmed) {
              event.preventDefault();
            }
            return;
          }

          const form = event.currentTarget;
          const comments = new FormData(form).get("comments");
          if (typeof comments !== "string" || !comments.trim()) {
            event.preventDefault();
            setClientError("Revision comments are required.");
          }
        }}
      >
        <input
          type="hidden"
          name="portfolio_output_id"
          value={portfolioOutputId}
        />
        <input type="hidden" name="submission_id" value={submissionId} />
        <input type="hidden" name="decision" value={decision} />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-zinc-900">Decision</legend>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="radio"
              name="decision_ui"
              checked={decision === "approved"}
              onChange={() => setDecision("approved")}
              disabled={isPending}
            />
            Approve
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="radio"
              name="decision_ui"
              checked={decision === "revision_required"}
              onChange={() => setDecision("revision_required")}
              disabled={isPending}
            />
            Request revision
          </label>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="comments">
            Comments
            {decision === "revision_required" ? " (required)" : " (optional)"}
          </Label>
          <Textarea
            id="comments"
            name="comments"
            rows={4}
            maxLength={2000}
            disabled={isPending}
            placeholder={
              decision === "revision_required"
                ? "Explain what the leader should revise"
                : "Optional note for the Admin"
            }
          />
          <p className="text-xs text-zinc-500">Maximum 2000 characters.</p>
        </div>

        {clientError || state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {clientError ?? state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="text-sm text-green-700" role="status">
            {state.success}
          </p>
        ) : null}

        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Submitting…"
            : decision === "approved"
              ? "Approve portfolio"
              : "Request revision"}
        </Button>
      </form>
    </section>
  );
}
