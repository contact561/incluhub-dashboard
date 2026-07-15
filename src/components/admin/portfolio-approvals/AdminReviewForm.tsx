"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  reviewPortfolioAsAdminAction,
  type ReviewPortfolioAsAdminState,
} from "@/actions/portfolio/reviewPortfolioAsAdmin";
import { ApprovalResultNotice } from "@/components/admin/portfolio-approvals/ApprovalResultNotice";
import { StatusPanel } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StudentCategory } from "@/types/database";

type AdminReviewFormProps = {
  portfolioOutputId: string;
  submissionId: string;
  teamId: string;
  portfolioType: StudentCategory;
  sequenceOrder: number | null;
};

const initialState: ReviewPortfolioAsAdminState = {};

export function AdminReviewForm({
  portfolioOutputId,
  submissionId,
  teamId,
  portfolioType,
  sequenceOrder,
}: AdminReviewFormProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approved" | "revision_required">(
    "approved"
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    reviewPortfolioAsAdminAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <>
      <ApprovalResultNotice state={state} />

      <form
        action={formAction}
        className="space-y-4"
        onSubmit={(event) => {
          setClientError(null);
          if (decision === "approved") {
            const confirmed = window.confirm(
              "Approve this portfolio and apply the sequential unlock?"
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
        <input type="hidden" name="team_id" value={teamId} />
        <input type="hidden" name="portfolio_type" value={portfolioType} />
        <input
          type="hidden"
          name="sequence_order"
          value={sequenceOrder ?? ""}
        />
        <input type="hidden" name="decision" value={decision} />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-text-primary">
            Decision
          </legend>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="radio"
              name="decision_ui"
              checked={decision === "approved"}
              onChange={() => setDecision("approved")}
              disabled={isPending}
              className="size-4 accent-[var(--brand-primary)]"
            />
            Approve
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="radio"
              name="decision_ui"
              checked={decision === "revision_required"}
              onChange={() => setDecision("revision_required")}
              disabled={isPending}
              className="size-4 accent-[var(--brand-primary)]"
            />
            Request revision
          </label>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="admin-comments">
            Comments
            {decision === "revision_required" ? " (required)" : " (optional)"}
          </Label>
          <Textarea
            id="admin-comments"
            name="comments"
            rows={4}
            maxLength={2000}
            disabled={isPending}
            className="w-full"
            placeholder={
              decision === "revision_required"
                ? "Explain what the leader should revise"
                : "Optional note for the record"
            }
          />
          <p className="text-xs text-text-subtle">Maximum 2000 characters.</p>
        </div>

        {clientError || state.error ? (
          <StatusPanel
            variant="danger"
            title="Could not submit review"
            description={clientError ?? state.error}
          />
        ) : null}

        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending
            ? "Submitting…"
            : decision === "approved"
              ? "Approve portfolio"
              : "Request revision"}
        </Button>
      </form>
    </>
  );
}
