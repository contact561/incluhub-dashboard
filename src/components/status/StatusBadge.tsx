import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
    case "confirmed":
    case "completed":
      return "default";
    case "inactive":
    case "paused":
    case "pending":
      return "secondary";
    case "suspended":
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={getStatusVariant(status)} className={cn(className)}>
      {formatStatusLabel(status)}
    </Badge>
  );
}
