import Link from "next/link";
import { notFound } from "next/navigation";
import { EnrollStudentsForm } from "@/components/forms/EnrollStudentsForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { QueryErrorState, StatusBadge } from "@/components/status";
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
      <div className="space-y-6">
        <PageHeader
          title="Program Detail"
          description="Manage participating institutes and student enrollments."
          secondaryActions={
            <Link
              href="/admin/programs"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Back to Programs
            </Link>
          }
        />
        <QueryErrorState title="Could not load program" message={error} />
      </div>
    );
  }

  if (!program) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={program.name}
        description="Participating institutes and enrolled students for this Program / Batch."
        secondaryActions={
          <Link
            href="/admin/programs"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Programs
          </Link>
        }
      />

      <section className="grid gap-4 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Status
          </p>
          <div className="mt-1">
            <StatusBadge status={program.status} />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Start
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {program.startDate ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            End
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {program.endDate ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Description
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {program.description ?? "—"}
          </p>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
        <SectionHeader title="Participating institutes" as="h2" compact />
        <ul className="mt-3 space-y-1 text-sm text-text-muted">
          {program.institutes.length === 0 ? (
            <li>—</li>
          ) : (
            program.institutes.map((institute) => (
              <li key={institute.id}>{institute.name}</li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
        <SectionHeader title="Enrolled students" as="h2" compact />
        {program.enrollments.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">
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
                <span className="font-medium text-text-primary">
                  {enrollment.fullName}
                </span>
                <span className="text-text-muted">
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

      <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
        <SectionHeader title="Enroll students" as="h2" compact />
        <p className="mb-3 text-sm text-text-muted">
          Only active students from participating institutes who are not
          already on a team can be enrolled for team creation.
        </p>
        {enrollable.error ? (
          <QueryErrorState
            title="Could not load enrollable students"
            message={enrollable.error}
          />
        ) : (
          <EnrollStudentsForm
            programId={program.id}
            students={enrollable.students}
          />
        )}
      </section>
    </div>
  );
}
