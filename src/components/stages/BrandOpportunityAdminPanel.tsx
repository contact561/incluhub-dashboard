"use client";

import { useActionState } from "react";
import {
  approveStage5Action,
  assignBrandOpportunityAction,
  reviewBrandProofAction,
  type BrandOpportunityActionState,
} from "@/actions/stages/brandOpportunity";
import { BrandOpportunityFiles } from "@/components/stages/BrandOpportunityFiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandOpportunityView } from "@/types/brand-opportunity";

const initial: BrandOpportunityActionState = {};

function Message({ state }: { state: BrandOpportunityActionState }) {
  if (state.error) return <p role="alert" className="text-sm text-destructive">{state.error}</p>;
  if (state.success) return <p role="status" className="text-sm text-status-success">{state.success}</p>;
  return null;
}

export function BrandOpportunityAdminPanel({ teamId, currentStageNumber, opportunity }: { teamId: string; currentStageNumber: number | null; opportunity: BrandOpportunityView | null }) {
  const [assignState, assignAction, assigning] = useActionState(assignBrandOpportunityAction, initial);
  const [reviewState, reviewAction, reviewing] = useActionState(reviewBrandProofAction, initial);
  const [approvalState, approvalAction, approving] = useActionState(approveStage5Action, initial);
  const latest = opportunity?.submissions[0] ?? null;

  return (
    <section className="space-y-4 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Stage 4 · Brand Opportunity</h2>
        <p className="mt-1 text-sm text-text-muted">Assign the brief and private files, review each proof version, then complete the separate Stage 5 final review.</p>
      </div>

      {currentStageNumber === 4 && (!opportunity || ["draft", "assigned"].includes(opportunity.status)) ? (
        <form action={assignAction} className="space-y-4 rounded-lg border border-border-default bg-surface-muted/40 p-4">
          <input type="hidden" name="team_id" value={teamId} />
          <h3 className="font-medium text-text-primary">{opportunity ? "Replace assignment before proof" : "Assign Brand Opportunity"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="brand-title">Title</Label><Input id="brand-title" name="title" minLength={3} maxLength={150} required defaultValue={opportunity?.title ?? ""} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="brand-description">Description</Label><Textarea id="brand-description" name="description" minLength={10} maxLength={4000} required defaultValue={opportunity?.description ?? ""} rows={4} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="brand-instructions">Instructions</Label><Textarea id="brand-instructions" name="instructions" maxLength={4000} defaultValue={opportunity?.instructions ?? ""} rows={4} /></div>
            <div className="space-y-2"><Label htmlFor="brand-scheduled">Scheduled date</Label><Input id="brand-scheduled" name="scheduled_date" type="date" required defaultValue={opportunity?.scheduledDate ?? ""} /></div>
            <div className="space-y-2"><Label htmlFor="brand-due">Due date</Label><Input id="brand-due" name="due_date" type="date" required defaultValue={opportunity?.dueDate ?? ""} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="brand-brief-files">Brief files (1–5 PDF/JPEG, 10 MB each)</Label><Input id="brand-brief-files" name="brief_files" type="file" accept="application/pdf,image/jpeg,.pdf,.jpg,.jpeg" multiple required /></div>
          </div>
          <Message state={assignState} />
          <Button disabled={assigning} type="submit">{assigning ? "Assigning…" : "Assign and notify team"}</Button>
        </form>
      ) : null}

      {opportunity ? (
        <div className="space-y-4 rounded-lg border border-border-default p-4">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{opportunity.status.replaceAll("_", " ")}</p><h3 className="mt-1 font-semibold text-text-primary">{opportunity.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">{opportunity.description}</p></div>
          <BrandOpportunityFiles files={opportunity.files} emptyLabel="The assignment is not active until 1–5 brief files are uploaded." />
          {latest ? (
            <div className="space-y-3 border-t border-border-default pt-4">
              <h3 className="font-medium text-text-primary">Latest proof · Version {latest.versionNumber}</h3>
              <BrandOpportunityFiles files={latest.files} />
              {latest.notes ? <p className="whitespace-pre-wrap text-sm text-text-muted">Student notes: {latest.notes}</p> : null}
              {latest.status === "submitted" ? (
                <form action={reviewAction} className="space-y-3">
                  <input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="submission_id" value={latest.id} />
                  <div className="space-y-2"><Label htmlFor="brand-review-comments">Review comments</Label><Textarea id="brand-review-comments" name="comments" maxLength={2000} rows={3} placeholder="Required when requesting a revision" /></div>
                  <Message state={reviewState} />
                  <div className="flex flex-wrap gap-2"><Button name="decision" value="approved" disabled={reviewing}>Approve proof</Button><Button name="decision" value="revision_required" variant="outline" disabled={reviewing}>Request revision</Button></div>
                </form>
              ) : latest.reviewComments ? <p className="rounded-lg bg-surface-muted p-3 text-sm text-text-muted">Review: {latest.reviewComments}</p> : null}
            </div>
          ) : <p className="text-sm text-text-muted">Waiting for the team to submit proof.</p>}
        </div>
      ) : null}

      {currentStageNumber === 5 && opportunity?.status === "approved" ? (
        <form action={approvalAction} className="space-y-3 rounded-lg border border-status-warning/30 bg-status-warning-soft p-4">
          <input type="hidden" name="team_id" value={teamId} />
          <h3 className="font-semibold text-text-primary">Stage 5 · Under Review</h3>
          <p className="text-sm text-text-muted">Ecosystem access stays locked until this separate final approval is recorded.</p>
          <div className="space-y-2"><Label htmlFor="stage5-remarks">Final review remarks (optional)</Label><Textarea id="stage5-remarks" name="remarks" maxLength={2000} rows={3} /></div>
          <Message state={approvalState} />
          <Button disabled={approving}>{approving ? "Approving…" : "Approve ecosystem access"}</Button>
        </form>
      ) : null}
    </section>
  );
}

