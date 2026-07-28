"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  submitMoodboardAction,
  type MoodboardActionState,
} from "@/actions/portfolio/moodboards";
import { StatusPanel } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GoogleDriveGuide } from "@/components/studio/GoogleDriveGuide";

export function MoodboardSubmissionForm({
  portfolioOutputId,
  isRevision = false,
  revisionComments = null,
}: {
  portfolioOutputId: string;
  isRevision?: boolean;
  revisionComments?: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    MoodboardActionState,
    FormData
  >(submitMoodboardAction, {});

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <section className="rounded-[var(--radius-card)] border border-brand-gold/40 bg-surface-muted/40 p-4">
      <h3 className="text-sm font-semibold text-text-primary">
        {isRevision ? "Revise moodboard" : "Submit moodboard"}
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        Admin must approve this moodboard before the team can book its studio
        shoot. Educators can view it and leave non-blocking comments.
      </p>
      {isRevision && revisionComments ? (
        <div className="mt-3">
          <StatusPanel
            variant="warning"
            title="Admin revision comments"
            description={revisionComments}
          />
        </div>
      ) : null}
      <form action={action} className="mt-4 space-y-4">
        <GoogleDriveGuide />
        <input
          type="hidden"
          name="portfolio_output_id"
          value={portfolioOutputId}
        />
        <div className="space-y-2">
          <Label htmlFor={`moodboard-title-${portfolioOutputId}`}>Title</Label>
          <Input
            id={`moodboard-title-${portfolioOutputId}`}
            name="title"
            required
            minLength={3}
            maxLength={150}
            disabled={pending}
            placeholder="e.g. Editorial beauty moodboard"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`moodboard-url-${portfolioOutputId}`}>
            Moodboard Google Drive URL
          </Label>
          <Input
            id={`moodboard-url-${portfolioOutputId}`}
            name="moodboard_url"
            type="url"
            required
            disabled={pending}
            placeholder="https://drive.google.com/…"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            name="link_tested"
            value="yes"
            required
            disabled={pending}
            className="mt-1"
          />
          I shared the link as Anyone with the link · Viewer and tested it in a
          private window.
        </label>
        <div className="space-y-2">
          <Label htmlFor={`moodboard-notes-${portfolioOutputId}`}>
            Notes (optional)
          </Label>
          <Textarea
            id={`moodboard-notes-${portfolioOutputId}`}
            name="notes"
            rows={3}
            maxLength={2000}
            disabled={pending}
          />
        </div>
        {state.error ? (
          <StatusPanel
            variant="danger"
            title="Moodboard not submitted"
            description={state.error}
          />
        ) : null}
        {state.success ? (
          <StatusPanel
            variant="success"
            title="Moodboard submitted"
            description={state.success}
          />
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending
            ? "Submitting…"
            : isRevision
              ? "Submit revised moodboard"
              : "Submit moodboard"}
        </Button>
      </form>
    </section>
  );
}
