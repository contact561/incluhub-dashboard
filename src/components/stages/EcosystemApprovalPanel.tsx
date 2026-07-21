"use client";

import { useActionState } from "react";
import {
  approveStudentEcosystemAccessAction,
  type ApproveEcosystemAccessState,
} from "@/actions/stages/approveEcosystemAccess";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import type { EcosystemAccessStatus, StudentCategory } from "@/types/database";

type EcosystemApprovalStudent = {
  id: string;
  fullName: string;
  category: StudentCategory;
  ecosystemAccessStatus: EcosystemAccessStatus;
};

type EcosystemApprovalPanelProps = {
  teamId: string;
  students: EcosystemApprovalStudent[];
};

const initialState: ApproveEcosystemAccessState = {};

function statusLabel(status: EcosystemAccessStatus): string {
  switch (status) {
    case "granted":
      return "Ecosystem access granted";
    case "pending_review":
      return "Awaiting Admin review";
    default:
      return "Not yet in review";
  }
}

export function EcosystemApprovalPanel({
  teamId,
  students,
}: EcosystemApprovalPanelProps) {
  const [state, formAction, pending] = useActionState(
    approveStudentEcosystemAccessAction,
    initialState
  );

  return (
    <section className="space-y-4 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Stage 5 · Ecosystem access
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Approve each student individually after reviewing their sessions and
          portfolio work. Students see a waiting message until you approve them.
        </p>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-status-success" role="status">
          {state.success}
        </p>
      ) : null}

      <ul className="space-y-3">
        {students.map((student) => (
          <li
            key={student.id}
            className="flex flex-col gap-3 rounded-lg border border-border-default p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-text-primary">
                {student.fullName}
              </p>
              <p className="text-sm text-text-muted">
                {STUDENT_CATEGORY_LABELS[student.category]}
              </p>
              <div className="mt-2">
                <StatusBadge status={student.ecosystemAccessStatus} />
                <span className="ml-2 text-xs text-text-muted">
                  {statusLabel(student.ecosystemAccessStatus)}
                </span>
              </div>
            </div>
            {student.ecosystemAccessStatus === "pending_review" ? (
              <form action={formAction}>
                <input type="hidden" name="team_id" value={teamId} />
                <input type="hidden" name="student_id" value={student.id} />
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Approving…" : "Approve ecosystem access"}
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
