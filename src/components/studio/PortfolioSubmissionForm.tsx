"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  submitPortfolioAction,
  type SubmitPortfolioState,
} from "@/actions/portfolio/submitPortfolio";
import { StatusPanel } from "@/components/status/StatusPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GoogleDriveGuide } from "@/components/studio/GoogleDriveGuide";

type PortfolioSubmissionFormProps = {
  portfolioOutputId: string;
};

const initialState: SubmitPortfolioState = {};

export function PortfolioSubmissionForm({
  portfolioOutputId,
}: PortfolioSubmissionFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    submitPortfolioAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-muted/40 p-4">
      <h3 className="text-sm font-semibold text-text-primary">Submit portfolio</h3>
      <p className="mt-1 text-sm text-text-muted">
        Upload the finished work to Google Drive, share it as Anyone with the
        link · Viewer, test it privately, then submit the link for review.
      </p>

      <form action={formAction} className="mt-4 space-y-4">
        <GoogleDriveGuide />
        <input
          type="hidden"
          name="portfolio_output_id"
          value={portfolioOutputId}
        />

        <div className="space-y-2">
          <Label htmlFor={`title-${portfolioOutputId}`}>Portfolio title</Label>
          <Input
            id={`title-${portfolioOutputId}`}
            name="title"
            type="text"
            required
            minLength={3}
            maxLength={150}
            placeholder="e.g. Editorial Beauty Series"
            disabled={isPending}
            className="min-h-11 w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`url-${portfolioOutputId}`}>Portfolio URL</Label>
          <Input
            id={`url-${portfolioOutputId}`}
            name="portfolio_url"
            type="url"
            required
            placeholder="https://"
            disabled={isPending}
            className="min-h-11 w-full"
          />
          <p className="text-xs text-text-muted">
            Required format: https://drive.google.com/…
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm text-text-primary">
          <input type="checkbox" name="link_tested" value="yes" required disabled={isPending} className="mt-1" />
          I set General access to Anyone with the link · Viewer and tested this link in a private window.
        </label>

        <div className="space-y-2">
          <Label htmlFor={`notes-${portfolioOutputId}`}>Notes (optional)</Label>
          <Textarea
            id={`notes-${portfolioOutputId}`}
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="Optional context for your educator"
            disabled={isPending}
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
            title="Portfolio submitted"
            description={state.success}
          />
        ) : null}

        <Button
          type="submit"
          className="min-h-11 w-full sm:w-auto"
          disabled={isPending}
        >
          {isPending ? "Submitting…" : "Submit Portfolio"}
        </Button>
      </form>
    </section>
  );
}
