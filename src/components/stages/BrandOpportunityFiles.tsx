import { DownloadIcon } from "lucide-react";
import type { BrandFileView } from "@/types/brand-opportunity";

function fileSize(bytes: number) {
  return `${Math.max(0.1, bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function BrandOpportunityFiles({
  files,
  emptyLabel = "No files are available.",
}: {
  files: BrandFileView[];
  emptyLabel?: string;
}) {
  if (!files.length) return <p className="text-sm text-text-muted">{emptyLabel}</p>;
  return (
    <ul className="space-y-2">
      {files.map((file) => (
        <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-default bg-surface-card p-3 text-sm">
          <span className="min-w-0 truncate text-text-primary">{file.fileName}</span>
          {file.signedUrl ? (
            <a href={file.signedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-primary underline underline-offset-2">
              <DownloadIcon className="size-4" aria-hidden /> Open ({fileSize(file.sizeBytes)})
            </a>
          ) : (
            <span className="text-xs text-text-muted">Secure link unavailable</span>
          )}
        </li>
      ))}
    </ul>
  );
}

