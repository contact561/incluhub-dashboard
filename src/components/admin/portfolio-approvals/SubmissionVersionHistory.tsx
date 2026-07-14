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
  if (versions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No submissions have been recorded.</p>
    );
  }

  return (
    <ol className="space-y-3">
      {versions.map((version) => (
        <li
          key={version.submissionId}
          className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-900">
              Version {version.versionNumber}
              {latestSubmissionId === version.submissionId ? (
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  (latest)
                </span>
              ) : null}
            </p>
            <p className="text-xs text-zinc-500">
              {formatSubmittedAt(version.submittedAt)}
            </p>
          </div>
          <p className="mt-2 text-sm text-zinc-800">{version.title}</p>
          <a
            href={version.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block break-all text-sm text-zinc-900 underline underline-offset-2"
          >
            {version.portfolioUrl}
          </a>
          {version.notes ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">
              {version.notes}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
