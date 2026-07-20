"use client";

import { useActionState } from "react";
import { submitBrandProofAction, type BrandOpportunityActionState } from "@/actions/stages/brandOpportunity";
import { BrandOpportunityFiles } from "@/components/stages/BrandOpportunityFiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandOpportunityView } from "@/types/brand-opportunity";

const initial: BrandOpportunityActionState = {};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00+05:30`));
}

export function BrandOpportunityStudentPanel({ teamId, opportunity }: { teamId: string; opportunity: BrandOpportunityView }) {
  const [state, action, pending] = useActionState(submitBrandProofAction, initial);
  const latest = opportunity.submissions[0] ?? null;
  const canSubmit = opportunity.status === "assigned" || opportunity.status === "revision_required";
  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Assigned Brand Opportunity</p>
        <h1 className="mt-1 text-xl font-semibold text-text-primary">{opportunity.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-muted">{opportunity.description}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-text-subtle">Scheduled</dt><dd className="font-medium text-text-primary">{formatDate(opportunity.scheduledDate)}</dd></div><div><dt className="text-text-subtle">Proof due</dt><dd className="font-medium text-text-primary">{formatDate(opportunity.dueDate)}</dd></div></dl>
        {opportunity.instructions ? <div className="mt-4 rounded-lg bg-surface-muted p-3"><p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Instructions</p><p className="mt-1 whitespace-pre-wrap text-sm text-text-muted">{opportunity.instructions}</p></div> : null}
        <div className="mt-4"><h2 className="mb-2 text-sm font-semibold text-text-primary">Admin brief files</h2><BrandOpportunityFiles files={opportunity.files} /></div>
      </section>

      {latest ? <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4"><h2 className="font-semibold text-text-primary">Proof history</h2><div className="mt-3 space-y-4">{opportunity.submissions.map((submission) => <article key={submission.id} className="rounded-lg border border-border-default p-3"><div className="flex justify-between gap-2"><p className="font-medium text-text-primary">Version {submission.versionNumber}</p><span className="text-xs font-semibold uppercase text-text-subtle">{submission.status.replaceAll("_", " ")}</span></div>{submission.notes ? <p className="mt-2 text-sm text-text-muted">{submission.notes}</p> : null}<div className="mt-3"><BrandOpportunityFiles files={submission.files} /></div>{submission.reviewComments ? <p className="mt-3 rounded-lg bg-status-warning-soft p-3 text-sm text-text-muted">Admin feedback: {submission.reviewComments}</p> : null}</article>)}</div></section> : null}

      {canSubmit ? <form action={action} className="space-y-4 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
        <input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="opportunity_id" value={opportunity.id} />
        <div><h2 className="font-semibold text-text-primary">{opportunity.status === "revision_required" ? "Submit revised proof" : "Submit proof of work"}</h2><p className="mt-1 text-sm text-text-muted">Upload 1–5 PDF or JPEG files that clearly demonstrate the team completed the assigned work.</p></div>
        <div className="space-y-2"><Label htmlFor="proof-files">Proof files</Label><Input id="proof-files" name="proof_files" type="file" accept="application/pdf,image/jpeg,.pdf,.jpg,.jpeg" multiple required /></div>
        <div className="space-y-2"><Label htmlFor="proof-notes">Notes (optional)</Label><Textarea id="proof-notes" name="notes" maxLength={2000} rows={4} /></div>
        {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}{state.success ? <p role="status" className="text-sm text-status-success">{state.success}</p> : null}
        <Button disabled={pending}>{pending ? "Submitting…" : "Submit proof for review"}</Button>
      </form> : <p className="rounded-[var(--radius-card)] border border-border-default bg-surface-muted p-4 text-sm text-text-muted">{opportunity.status === "proof_submitted" ? "Your proof is awaiting Admin review. No further action is required right now." : opportunity.status === "approved" ? "Your proof was approved. Stage 5 is now Under Review." : "Proof submission is not available yet."}</p>}
    </div>
  );
}

