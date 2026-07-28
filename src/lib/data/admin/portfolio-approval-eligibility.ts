import type { AdminReviewEntryPath } from "@/types/admin-portfolio-approval";
import type {
  PortfolioReviewDecision,
  PortfolioReviewerStage,
  PortfolioWorkflowStatus,
} from "@/types/database";

type SubmissionLite = {
  id: string;
  version_number: number;
};

type ReviewLite = {
  portfolio_submission_id: string;
  reviewer_stage: PortfolioReviewerStage;
  reviewer_user_id: string;
  decision: PortfolioReviewDecision;
  comments: string | null;
  created_at: string;
};

export type AdminReviewEligibility = {
  adminReviewEntryPath: AdminReviewEntryPath;
  latestSubmissionHasEducatorApproval: boolean;
  enteredFromAdminRevision: boolean;
  educatorReview: ReviewLite | null;
  previousAdminRevisionReview: ReviewLite | null;
  previousSubmissionVersion: number | null;
};

export function resolveAdminReviewEligibility(
  latest: SubmissionLite | null,
  submissions: SubmissionLite[],
  reviews: ReviewLite[]
): AdminReviewEligibility {
  if (!latest) {
    return {
      adminReviewEntryPath: "invalid",
      latestSubmissionHasEducatorApproval: false,
      enteredFromAdminRevision: false,
      educatorReview: null,
      previousAdminRevisionReview: null,
      previousSubmissionVersion: null,
    };
  }

  const reviewsBySubmissionId = groupReviewsBySubmission(reviews);
  const submissionByVersion = new Map(
    submissions.map((submission) => [submission.version_number, submission] as const)
  );

  if (latest.version_number > 1) {
    const previousVersion = latest.version_number - 1;
    const previousSubmission = submissionByVersion.get(previousVersion);

    if (
      previousSubmission &&
      previousSubmission.version_number + 1 === latest.version_number
    ) {
      const previousReviews = reviewsBySubmissionId.get(previousSubmission.id) ?? [];
      const adminRevisionReview =
        previousReviews.find(
          (review) =>
            review.reviewer_stage === "admin" &&
            review.decision === "revision_required"
        ) ?? null;

      if (adminRevisionReview) {
        return {
          adminReviewEntryPath: "admin_revision_resubmission",
          latestSubmissionHasEducatorApproval: false,
          enteredFromAdminRevision: true,
          educatorReview: null,
          previousAdminRevisionReview: adminRevisionReview,
          previousSubmissionVersion: previousVersion,
        };
      }
    }
  }

  return {
    adminReviewEntryPath: "direct_submission",
    latestSubmissionHasEducatorApproval: false,
    enteredFromAdminRevision: false,
    educatorReview: null,
    previousAdminRevisionReview: null,
    previousSubmissionVersion: null,
  };
}

export function canAdminReviewPortfolio(
  workflowStatus: PortfolioWorkflowStatus | null,
  entryPath: AdminReviewEntryPath,
  hasLatestSubmission: boolean
): boolean {
  return (
    workflowStatus === "pending_admin" &&
    hasLatestSubmission &&
    entryPath !== "invalid"
  );
}

function groupReviewsBySubmission(
  reviews: ReviewLite[]
): Map<string, ReviewLite[]> {
  const grouped = new Map<string, ReviewLite[]>();
  for (const review of reviews) {
    const list = grouped.get(review.portfolio_submission_id) ?? [];
    list.push(review);
    grouped.set(review.portfolio_submission_id, list);
  }
  return grouped;
}
