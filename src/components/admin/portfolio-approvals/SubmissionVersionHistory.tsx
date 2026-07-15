import { Timeline, type TimelineItem } from "@/components/status";
import type { AdminPortfolioSubmissionVersion } from "@/types/admin-portfolio-approval";

type SubmissionVersionHistoryProps = {
  versions: AdminPortfolioSubmissionVersion[];
  latestSubmissionId: string | null;
};

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SubmissionVersionHistory({
  versions,
  latestSubmissionId,
}: SubmissionVersionHistoryProps) {
  const items: TimelineItem[] = versions.map((version) => ({
    id: version.submissionId,
    title: `Version ${version.versionNumber}${
      latestSubmissionId === version.submissionId ? " (latest)" : ""
    }`,
    timestamp: formatSubmittedAt(version.submittedAt),
    description: (
      <div className="space-y-2">
        <p>{version.title}</p>
        <a
          href={version.portfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {version.portfolioUrl}
        </a>
        {version.notes ? (
          <p className="whitespace-pre-wrap text-text-muted">{version.notes}</p>
        ) : null}
      </div>
    ),
  }));

  return (
    <Timeline
      title="Submission history"
      items={items}
      emptyMessage="No submissions have been recorded."
    />
  );
}
