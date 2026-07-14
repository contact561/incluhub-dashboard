import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import type { StudentCategory } from "@/types/database";

export function buildAdminApprovalSuccessMessage(
  portfolioType: StudentCategory,
  sequenceOrder: number | null
): string {
  const approvedLabel = STUDENT_CATEGORY_LABELS[portfolioType] ?? "Portfolio";

  if (sequenceOrder === 1) {
    return `${approvedLabel} completed. Makeup portfolio is now ready for studio booking.`;
  }

  if (sequenceOrder === 2) {
    return `${approvedLabel} completed. Hairstyling portfolio is now ready for studio booking.`;
  }

  if (sequenceOrder === 3) {
    return `${approvedLabel} completed. Stage 3 completed and Stage 4 started.`;
  }

  return `${approvedLabel} approved successfully.`;
}

export const ADMIN_REVISION_SUCCESS_MESSAGE =
  "Revision requested. The portfolio leader must resubmit before Admin review can continue.";
