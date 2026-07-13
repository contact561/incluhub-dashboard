import { Badge } from "@/components/ui/badge";
import { EmptyState, QueryErrorState } from "@/components/status";
import { StatusBadge } from "@/components/status/StatusBadge";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import {
  EDUCATOR_TYPE_LABELS,
  STUDENT_CATEGORY_LABELS,
  formatEnumLabel,
} from "@/lib/constants/labels";
import { getStudentMyTeamPageData } from "@/lib/data/student/myTeam";
import { formatCurrentStageLabel } from "@/lib/data/student/myStage";

export default async function StudentMyTeamPage() {
  const { data, error } = await getStudentMyTeamPageData();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="My Team"
        description="View your assigned team, members, and educators."
      />
      <div className="space-y-6 p-6">
        {error ? <QueryErrorState message={error} /> : null}

        {!error && !data ? (
          <EmptyState
            title="No team assigned"
            description="You are not currently assigned to a team."
          />
        ) : null}

        {data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Team
                </p>
                <p className="mt-1 text-sm text-zinc-900">{data.teamName}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Program
                </p>
                <p className="mt-1 text-sm text-zinc-900">
                  {data.programName ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Team status
                </p>
                <div className="mt-1">
                  <StatusBadge status={data.teamStatus} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Current stage
                </p>
                <p className="mt-1 text-sm text-zinc-900">
                  {formatCurrentStageLabel(data.currentStageNumber)}
                </p>
                <div className="mt-1">
                  <StatusBadge status={data.stageStatus} />
                </div>
              </div>
            </section>

            {data.isIncompleteTeam ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Your team is not yet complete. All three member roles must be
                assigned before the stage journey can proceed.
              </p>
            ) : null}

            <section className="rounded-lg border border-zinc-200 p-4">
              <h2 className="text-sm font-semibold text-zinc-900">
                Team members
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Read-only view of your team&apos;s active members and assigned
                educators.
              </p>

              {data.members.length === 0 ? (
                <EmptyState
                  title="No active members"
                  description="This team does not have any active members yet."
                />
              ) : (
                <ul className="mt-4 space-y-4">
                  {data.members.map((member) => (
                    <li
                      key={member.studentId}
                      className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900">
                          {member.fullName}
                        </p>
                        {member.isCurrentStudent ? (
                          <Badge variant="secondary">You</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        {STUDENT_CATEGORY_LABELS[member.category]}
                      </p>
                      {member.educator ? (
                        <p className="mt-2 text-sm text-zinc-700">
                          Educator: {member.educator.fullName} ·{" "}
                          {EDUCATOR_TYPE_LABELS[member.educator.educatorType]}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-zinc-500">
                          No educator assigned yet.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-xs text-zinc-400">
              Shared stage status: {formatEnumLabel(data.stageStatus)}. This page
              is read-only.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
