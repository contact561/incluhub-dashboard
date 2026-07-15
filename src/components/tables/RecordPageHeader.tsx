import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";

type RecordPageHeaderProps = {
  title: string;
  description: string;
  count?: number;
  actions?: ReactNode;
};

/**
 * Compatibility wrapper over PageHeader for existing list/record pages.
 * Preserves prior props and bordered chrome without requiring call-site changes.
 */
export function RecordPageHeader({
  title,
  description,
  count,
  actions,
}: RecordPageHeaderProps) {
  return (
    <PageHeader
      bordered
      title={title}
      description={description}
      metadata={
        count !== undefined ? (
          <>
            {count} {count === 1 ? "record" : "records"}
          </>
        ) : undefined
      }
      primaryAction={actions}
    />
  );
}
