"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  resubmitPortfolioAction,
  type ResubmitPortfolioState,
} from "@/actions/portfolio/resubmitPortfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PortfolioResubmissionFormProps = {
  portfolioOutputId: string;
  nextVersionNumber: number;
  previousTitle: string;
  previousUrl: string;
  previousNotes: string | null;
};

const initialState: ResubmitPortfolioState = {};

export function PortfolioResubmissionForm({
  portfolioOutputId,
  nextVersionNumber,
  previousTitle,
  previousUrl,
  previousNotes,
}: PortfolioResubmissionFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    resubmitPortfolioAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  // Blocks a duplicate resubmission while the request is pending or after
  // success (until the refreshed status removes this form).
  const isBlocked = isPending || Boolean(state.success);

  return (
    <section className="rounded-lg border border-zinc-200 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        Resubmit portfolio · Version {nextVersionNumber}
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Submitting creates a new version. Earlier versions are kept unchanged
        and the portfolio returns to the reviewer who requested the revision.
      </p>

      <form action={formAction} className="mt-4 space-y-4">
        <input
          type="hidden"
          name="portfolio_output_id"
          value={portfolioOutputId}
        />

        <div className="space-y-2">
          <Label htmlFor={`resubmit-title-${portfolioOutputId}`}>
            Portfolio title
          </Label>
          <Input
            id={`resubmit-title-${portfolioOutputId}`}
            name="title"
            type="text"
            required
            minLength={3}
            maxLength={150}
            defaultValue={previousTitle}
            placeholder="e.g. Editorial Beauty Series"
            disabled={isBlocked}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`resubmit-url-${portfolioOutputId}`}>
            Portfolio URL
          </Label>
          <Input
            id={`resubmit-url-${portfolioOutputId}`}
            name="portfolio_url"
            type="url"
            required
            defaultValue={previousUrl}
            placeholder="https://"
            disabled={isBlocked}
          />
          <p className="text-xs text-zinc-500">
            Use a public HTTP or HTTPS link (Google Drive, Behance, Dropbox,
            OneDrive, or your portfolio site).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`resubmit-notes-${portfolioOutputId}`}>
            Notes (optional)
          </Label>
          <Textarea
            id={`resubmit-notes-${portfolioOutputId}`}
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={previousNotes ?? ""}
            placeholder="Describe what changed in this version"
            disabled={isBlocked}
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

        <Button type="submit" disabled={isBlocked}>
          {isPending ? "Resubmitting…" : "Resubmit Portfolio"}
        </Button>
      </form>
    </section>
  );
}
