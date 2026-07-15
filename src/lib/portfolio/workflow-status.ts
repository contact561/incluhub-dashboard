import type {
  PortfolioRevisionRoute,
  PortfolioWorkflowStatus,
  StudentCategory,
} from "@/types/database";
import {
  getPortfolioWorkflowSemanticIntent,
  isPortfolioWorkflowStatus,
} from "@/lib/status/status-intent";

export type PortfolioWorkflowPresentation = {
  title: string;
  description: string;
};

export {
  getPortfolioWorkflowSemanticIntent,
  isPortfolioWorkflowStatus,
};

function educatorLabelForPortfolioType(
  portfolioType: StudentCategory
): string {
  switch (portfolioType) {
    case "photographer":
      return "Photography Educator";
    case "makeup_artist":
      return "Makeup Educator";
    case "hairstylist":
      return "Hairstyling Educator";
    default:
      return "Educator";
  }
}

function lockedDescription(sequenceOrder: number | undefined): string {
  if (sequenceOrder === 2) {
    return "Complete the Photography portfolio before this portfolio begins.";
  }
  if (sequenceOrder === 3) {
    return "Complete the Makeup portfolio before this portfolio begins.";
  }
  return "Complete the previous portfolio before this portfolio begins.";
}

export function getPortfolioWorkflowPresentation(
  workflowStatus: PortfolioWorkflowStatus,
  portfolioType: StudentCategory,
  options: {
    revisionReturnTo?: PortfolioRevisionRoute | null;
    sequenceOrder?: number;
  } = {}
): PortfolioWorkflowPresentation {
  switch (workflowStatus) {
    case "locked":
      return {
        title: "Locked",
        description: lockedDescription(options.sequenceOrder),
      };
    case "awaiting_booking":
      return {
        title: "Ready for studio booking",
        description: "Book the studio before submitting your portfolio.",
      };
    case "awaiting_submission":
      return {
        title: "Ready for portfolio submission",
        description:
          "Your studio booking is complete. Submit your portfolio link.",
      };
    case "pending_educator":
      return {
        title: "Awaiting Educator approval",
        description: `Waiting for ${educatorLabelForPortfolioType(portfolioType)} review.`,
      };
    case "pending_admin":
      return {
        title: "Educator approved",
        description: "Awaiting final Admin approval.",
      };
    case "revision_required":
      if (options.revisionReturnTo === "admin") {
        return {
          title: "Revision requested by Admin",
          description:
            "Read the Admin feedback and resubmit a new portfolio version.",
        };
      }
      return {
        title: "Revision requested by Educator",
        description:
          "Read the Educator feedback and resubmit a new portfolio version.",
      };
    case "completed":
      return {
        title: "Portfolio approved",
        description: "Educator and Admin approval completed.",
      };
    default: {
      const _exhaustive: never = workflowStatus;
      return _exhaustive;
    }
  }
}

export function shouldShowSubmittedPortfolioSummary(
  workflowStatus: PortfolioWorkflowStatus
): boolean {
  return (
    workflowStatus === "pending_educator" ||
    workflowStatus === "pending_admin" ||
    workflowStatus === "revision_required" ||
    workflowStatus === "completed"
  );
}

export function findActiveTeamPortfolio<
  T extends { sequenceOrder: number; workflowStatus: PortfolioWorkflowStatus }
>(portfolios: T[]): T | null {
  const sorted = portfolios.slice().sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  return sorted.find((portfolio) => portfolio.workflowStatus !== "completed") ?? null;
}
