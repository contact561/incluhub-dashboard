import Link from "next/link";
import { notFound } from "next/navigation";
import { EnrollStudentsForm } from "@/components/forms/EnrollStudentsForm";
import { QueryErrorState } from "@/components/status/QueryErrorState";
import { StatusBadge } from "@/components/status/StatusBadge";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import {
  getAdminProgramById,
  getEnrollableStudentsForProgram,
} from "@/lib/data/admin/programs";
import { cn } from "@/lib/utils";

type AdminProgramDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminProgramDetailPage({
  params,
}: AdminProgramDetailPageProps) {
  const { id } = await params;
  const [{ program, error }, enrollable] = await Promise.all([
    getAdminProgramById(id),
    getEnrollableStudentsForProgram(id),
  ]);

  if (error) {
    return (
      <div className="flex min-h-full flex-col">
        <RecordPageHeader
          title="Program Detail"
          description="Manage participating institutes and student enrollments."
          actions={
            <Link
              href="/admin/programs"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Back to Programs
            </Link>
          }
        />
        <div className="p-6">
          <QueryErrorState message={error} />
        </div>
      </div>
    );
  }

  if (!program) {
    notFound();
  }

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title={program.name}
        description="Participating institutes and enrolled students for this Program / Batch."
        actions={
          <Link
            href="/admin/programs"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Programs
          </Link>
        }
      />
      <div className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Status
            </p>
            <div className="mt-1">
              <StatusBadge status={program.status} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Start
            </p>
            <p className="mt-1 text-sm text-zinc-900">
              {program.startDate ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              End
            </p>
            <p className="mt-1 text-sm text-zinc-900">
              {program.endDate ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Description
            </p>
            <p className="mt-1 text-sm text-zinc-900">
              {program.description ?? "—"}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Participating institutes
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-zinc-700">
            {program.institutes.length === 0 ? (
              <li>—</li>
            ) : (
              program.institutes.map((institute) => (
                <li key={institute.id}>{institute.name}</li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Enrolled students
          </h2>
          {program.enrollments.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No students enrolled yet. Enroll students below before creating a
              team.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {program.enrollments.map((enrollment) => (
                <li
                  key={enrollment.id}
                  className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-zinc-900">
                    {enrollment.fullName}
                  </span>
                  <span className="text-zinc-500">
                    {STUDENT_CATEGORY_LABELS[enrollment.category]} ·{" "}
                    {enrollment.institute ?? "—"} · {enrollment.email}
                    {enrollment.currentTeamId
                      ? " · already on a team"
                      : " · available for team"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">
            Enroll students
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            Only active students from participating institutes who are not
            already on a team can be enrolled for team creation.
          </p>
          {enrollable.error ? (
            <QueryErrorState message={enrollable.error} />
          ) : (
            <EnrollStudentsForm
              programId={program.id}
              students={enrollable.students}
            />
          )}
        </section>
      </div>
    </div>
  );
}
