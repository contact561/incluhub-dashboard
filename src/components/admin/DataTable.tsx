import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DataTableProps = {
  children: ReactNode;
  /** Optional filter row above the table (existing forms only). */
  filters?: ReactNode;
  className?: string;
};

/**
 * Admin list presentation wrapper — overflow, surface, and radius only.
 * Does not fetch, sort, or paginate data.
 */
export function DataTable({ children, filters, className }: DataTableProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {filters}
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border-default bg-surface-card">
        {children}
      </div>
    </div>
  );
}
