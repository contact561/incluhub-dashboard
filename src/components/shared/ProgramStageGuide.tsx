import { PROGRAM_STAGE_GUIDE } from "@/lib/constants/program-stage-guide";
import { cn } from "@/lib/utils";

type ProgramStageGuideProps = {
  currentStage?: number | null;
  className?: string;
};

export function ProgramStageGuide({
  currentStage = null,
  className,
}: ProgramStageGuideProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5",
        className
      )}
    >
      <h2 className="font-semibold text-text-primary">
        How the IncluHub programme works
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Five connected stages. Each role has clear responsibilities — work
        unlocks only when the previous stage requirements are met.
      </p>

      <div className="mt-4 space-y-4">
        {PROGRAM_STAGE_GUIDE.map((stage) => {
          const isCurrent = currentStage === stage.stageNumber;
          return (
            <article
              key={stage.stageNumber}
              className={cn(
                "rounded-lg border p-4",
                isCurrent
                  ? "border-brand-primary bg-brand-primary/5"
                  : "border-border-default bg-surface-muted/30"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                  Stage {stage.stageNumber}
                </span>
                {isCurrent ? (
                  <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    You are here
                  </span>
                ) : null}
              </div>
              <h3 className="mt-1 text-sm font-semibold text-text-primary">
                {stage.title}
              </h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
                    Student
                  </dt>
                  <dd className="mt-1 text-sm text-text-muted">
                    {stage.student}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-text-primary">
                    Educator
                  </dt>
                  <dd className="mt-1 text-sm text-text-muted">
                    {stage.educator}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
                    IncluHub Admin
                  </dt>
                  <dd className="mt-1 text-sm text-text-muted">
                    {stage.incluhub}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
