import type { ReactNode } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  XCircleIcon,
  CircleDotIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_INTENT_CLASSES,
  type StatusIntent,
} from "@/lib/status/status-intent";

export type StatusPanelVariant =
  | "information"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

type StatusPanelProps = {
  variant?: StatusPanelVariant;
  title: string;
  children?: ReactNode;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

function variantToIntent(variant: StatusPanelVariant): StatusIntent {
  switch (variant) {
    case "information":
      return "info";
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "danger":
      return "danger";
    case "neutral":
    default:
      return "neutral";
  }
}

function DefaultIcon({ intent }: { intent: StatusIntent }) {
  const className = cn("size-4 shrink-0", STATUS_INTENT_CLASSES[intent].icon);
  switch (intent) {
    case "success":
      return <CheckCircle2Icon aria-hidden className={className} />;
    case "warning":
      return <AlertTriangleIcon aria-hidden className={className} />;
    case "danger":
      return <XCircleIcon aria-hidden className={className} />;
    case "info":
      return <InfoIcon aria-hidden className={className} />;
    default:
      return <CircleDotIcon aria-hidden className={className} />;
  }
}

/**
 * Shared callout panel for information / success / warning / danger / neutral.
 * Created in UI-1C1 for later adoption in UI-2 / UI-3 / UI-4 (not wired into role pages yet).
 */
export function StatusPanel({
  variant = "neutral",
  title,
  description,
  children,
  icon,
  action,
  className,
}: StatusPanelProps) {
  const intent = variantToIntent(variant);
  const styles = STATUS_INTENT_CLASSES[intent];

  return (
    <section
      role="status"
      className={cn(
        "rounded-[var(--radius-card)] border p-4",
        styles.panel,
        className
      )}
    >
      <div className="flex gap-3">
        <div className="mt-0.5 shrink-0">
          {icon ?? <DefaultIcon intent={intent} />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className={cn("text-sm font-semibold", styles.title)}>{title}</h3>
          {description ? (
            <p className={cn("text-sm", styles.body)}>{description}</p>
          ) : null}
          {children ? (
            <div className={cn("text-sm", styles.body)}>{children}</div>
          ) : null}
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}
