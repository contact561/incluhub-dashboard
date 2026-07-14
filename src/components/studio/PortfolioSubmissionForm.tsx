"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  submitPortfolioAction,
  type SubmitPortfolioState,
} from "@/actions/portfolio/submitPortfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    <section className="rounded-lg border border-zinc-200 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Submit portfolio</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Enter a title and an external portfolio link. IncluHub does not host
        files or images. After submission, this entry cannot be edited until a
        revision is formally requested in a future workflow.
      </p>

      <form action={formAction} className="mt-4 space-y-4">
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
          />
          <p className="text-xs text-zinc-500">
            Use a public HTTP or HTTPS link (Google Drive, Behance, Dropbox,
            OneDrive, or your portfolio site).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`notes-${portfolioOutputId}`}>Notes (optional)</Label>
          <Textarea
            id={`notes-${portfolioOutputId}`}
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="Optional context for your educator"
            disabled={isPending}
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

        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting…" : "Submit Portfolio"}
        </Button>
      </form>
    </section>
  );
}
