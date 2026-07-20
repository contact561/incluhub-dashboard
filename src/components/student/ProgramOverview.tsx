import { cn } from "@/lib/utils";

const stages = [
  [1, "Prepare", "Complete onboarding and receive your balanced creative team."],
  [2, "BMS", "Attend the BMS session recorded by IncluHub Admin."],
  [3, "Create", "Complete three studio portfolios as leader and assistant."],
  [4, "Brand Opportunity", "Review the assigned brief and submit proof of work."],
  [5, "Final review", "Wait for final approval, then enter the IncluHub ecosystem."],
] as const;

export function ProgramOverview({ currentStage }: { currentStage: number | null }) {
  return <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
    <h2 className="font-semibold text-text-primary">How the IncluHub programme works</h2>
    <p className="mt-1 text-sm text-text-muted">Your team moves through five connected stages. Each stage unlocks only after the required work and review are complete.</p>
    <ol className="mt-4 grid gap-3 md:grid-cols-5">
      {stages.map(([number, title, description]) => <li key={number} className={cn("rounded-lg border p-3", currentStage === number ? "border-brand-primary bg-brand-primary/5" : "border-border-default bg-surface-muted/40")}>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Stage {number}</p>
        <p className="mt-1 text-sm font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-xs text-text-muted">{description}</p>
      </li>)}
    </ol>
  </section>;
}

