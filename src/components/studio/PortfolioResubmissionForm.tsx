"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  resubmitPortfolioAction,
  type ResubmitPortfolioState,
} from "@/actions/portfolio/resubmitPortfolio";
import { StatusPanel } from "@/components/status/StatusPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GoogleDriveGuide } from "@/components/studio/GoogleDriveGuide";

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

  const isBlocked = isPending || Boolean(state.success);

  return (
    <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-muted/40 p-4">
      <h3 className="text-sm font-semibold text-text-primary">
        Resubmit portfolio · Version {nextVersionNumber}
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        Submitting creates a new version. Earlier versions are kept unchanged
        and the portfolio returns to the reviewer who requested the revision.
      </p>

      <form action={formAction} className="mt-4 space-y-4">
        <GoogleDriveGuide />
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
            className="min-h-11 w-full"
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
            className="min-h-11 w-full"
          />
          <p className="text-xs text-text-muted">
            Required format: https://drive.google.com/…
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm text-text-primary">
          <input type="checkbox" name="link_tested" value="yes" required disabled={isBlocked} className="mt-1" />
          I set General access to Anyone with the link · Viewer and tested this link in a private window.
        </label>

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
            className="w-full"
          />
        </div>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <StatusPanel
            variant="success"
            title="Portfolio resubmitted"
            description={state.success}
          />
        ) : null}

        <Button
          type="submit"
          className="min-h-11 w-full sm:w-auto"
          disabled={isBlocked}
        >
          {isPending ? "Resubmitting…" : "Resubmit Portfolio"}
        </Button>
      </form>
    </section>
  );
}
