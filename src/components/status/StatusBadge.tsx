import {
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
  ClockIcon,
  InfoIcon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPortfolioWorkflowSemanticIntent,
  isPortfolioWorkflowStatus,
  STATUS_INTENT_CLASSES,
  type StatusIntent,
} from "@/lib/status/status-intent";

type StatusBadgeProps = {
  status: string;
  className?: string;
  /** When false, uses a filled dot instead of a lucide icon. Default true. */
  showIcon?: boolean;
};

function getRecordStatusIntent(status: string): StatusIntent {
  if (isPortfolioWorkflowStatus(status)) {
    return getPortfolioWorkflowSemanticIntent(status);
  }

  switch (status) {
    case "active":
    case "confirmed":
    case "completed":
    case "approved":
      return "success";
    case "pending":
    case "pending_review":
      return "warning";
    case "granted":
      return "success";
    case "draft":
      return "info";
    case "inactive":
    case "paused":
      return "neutral";
    case "rejected":
    case "suspended":
      return "danger";
    default:
      return "neutral";
  }
}

/** Preserve existing underscore-title casing used across tables and stage UI. */
export function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function StatusIntentIcon({
  intent,
  className,
}: {
  intent: StatusIntent;
  className?: string;
}) {
  const iconClass = cn("size-3 shrink-0", className);
  switch (intent) {
    case "success":
      return <CheckCircle2Icon aria-hidden className={iconClass} />;
    case "warning":
      return <ClockIcon aria-hidden className={iconClass} />;
    case "danger":
      return <XCircleIcon aria-hidden className={iconClass} />;
    case "info":
      return <InfoIcon aria-hidden className={iconClass} />;
    case "neutral":
    default:
      return <CircleDotIcon aria-hidden className={iconClass} />;
  }
}

/**
 * Generic record-status chip (active / pending / draft / …).
 * For portfolio_workflow_status, prefer PortfolioWorkflowBadge so labels stay
 * backend-canonical via PORTFOLIO_WORKFLOW_STATUS_LABELS.
 */
export function StatusBadge({
  status,
  className,
  showIcon = true,
}: StatusBadgeProps) {
  const intent = getRecordStatusIntent(status);
  const styles = STATUS_INTENT_CLASSES[intent];
  const label = formatStatusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit max-w-full items-center gap-1 rounded-md border px-2 text-xs font-medium",
        styles.badge,
        className
      )}
      title={label}
    >
      {showIcon ? (
        <StatusIntentIcon intent={intent} className={styles.icon} />
      ) : (
        <CircleIcon
          aria-hidden
          className={cn("size-2.5 shrink-0 fill-current", styles.icon)}
        />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}
