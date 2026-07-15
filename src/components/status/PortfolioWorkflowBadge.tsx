import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  ClockIcon,
  InfoIcon,
  LockIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PORTFOLIO_WORKFLOW_STATUS_LABELS } from "@/lib/constants/stage-labels";
import {
  getPortfolioWorkflowSemanticIntent,
  isPortfolioWorkflowStatus,
  STATUS_INTENT_CLASSES,
  type StatusIntent,
} from "@/lib/status/status-intent";
import type { PortfolioWorkflowStatus } from "@/types/database";
import { formatStatusLabel } from "@/components/status/StatusBadge";

type PortfolioWorkflowBadgeProps = {
  status: PortfolioWorkflowStatus | string;
  className?: string;
  showIcon?: boolean;
};

function WorkflowIcon({
  status,
  intent,
  className,
}: {
  status: string;
  intent: StatusIntent;
  className?: string;
}) {
  const iconClass = cn("size-3 shrink-0", className);
  if (status === "locked") {
    return <LockIcon aria-hidden className={iconClass} />;
  }
  if (status === "revision_required") {
    return <AlertTriangleIcon aria-hidden className={iconClass} />;
  }
  switch (intent) {
    case "success":
      return <CheckCircle2Icon aria-hidden className={iconClass} />;
    case "warning":
      return <ClockIcon aria-hidden className={iconClass} />;
    case "info":
      return <InfoIcon aria-hidden className={iconClass} />;
    default:
      return <CircleDotIcon aria-hidden className={iconClass} />;
  }
}

/**
 * Portfolio workflow status chip.
 * Labels come only from PORTFOLIO_WORKFLOW_STATUS_LABELS (canonical presentation titles).
 * Does not alter backend workflow values.
 */
export function PortfolioWorkflowBadge({
  status,
  className,
  showIcon = true,
}: PortfolioWorkflowBadgeProps) {
  const known = isPortfolioWorkflowStatus(status);
  const intent = known
    ? getPortfolioWorkflowSemanticIntent(status)
    : ("neutral" as StatusIntent);
  const styles = STATUS_INTENT_CLASSES[intent];
  const label = known
    ? PORTFOLIO_WORKFLOW_STATUS_LABELS[status]
    : formatStatusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit max-w-full items-center gap-1 rounded-md border px-2 text-xs font-medium",
        styles.badge,
        className
      )}
      title={label}
      data-workflow-status={status}
    >
      {showIcon ? (
        <WorkflowIcon status={status} intent={intent} className={styles.icon} />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
