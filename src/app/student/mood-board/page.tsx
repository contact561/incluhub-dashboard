import { MoodBoardSubmitForm } from "@/components/moodboard/MoodBoardSubmitForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { getOwnMoodBoardSubmissions } from "@/lib/data/moodboard";

export default async function StudentMoodBoardPage() {
  const { rows, error } = await getOwnMoodBoardSubmissions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mood Board"
        description="Submit your mood board after BMS. Institute educator and Admin both approve before portfolio/studio unlocks fully."
      />

      <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4">
        <SectionHeader title="Submit" description="Share a link to your mood board." />
        <div className="mt-4 max-w-xl">
          <MoodBoardSubmitForm />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Your submissions" count={rows.length} />
        {error ? <QueryErrorState message={error} /> : null}
        {!error && rows.length === 0 ? (
          <EmptyState
            title="No mood boards yet"
            description="Submit your first version when Stage 3 is open (after BMS)."
          />
        ) : null}
        {!error && rows.length > 0 ? (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4"
              >
                <p className="font-medium text-text-primary">
                  v{row.versionNumber} · {row.title}
                </p>
                <p className="mt-1 text-sm text-text-muted">Status: {row.status}</p>
                <a
                  href={row.moodBoardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm text-brand-primary underline"
                >
                  Open mood board
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
