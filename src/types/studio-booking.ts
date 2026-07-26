import type { StudioSlotCode } from "@/lib/constants/studioSlots";
import type {
  PortfolioRevisionFeedback,
  PortfolioSubmissionVersionView,
  PortfolioSubmissionView,
} from "@/types/portfolio-submission";
import type {
  PortfolioRevisionRoute,
  PortfolioWorkflowStatus,
  StudentCategory,
} from "@/types/database";

export type StudioSlotAvailability = {
  slotCode: StudioSlotCode;
  available: boolean;
};

export type ConfirmedStudioBooking = {
  id: string;
  portfolioOutputId: string;
  bookingDate: string;
  slotCode: StudioSlotCode;
  bookedAt: string;
  verificationStatus: "online_confirmed" | "physically_verified" | "no_show";
  physicallyVerifiedAt: string | null;
};

export type AssistantAvailabilityChoice = {
  assistantStudentId: string;
  assistantName: string;
  bookingDate: string;
  slotCode: StudioSlotCode;
};

export type PortfolioParticipantView = {
  studentId: string;
  fullName: string;
  category: StudentCategory;
  role: "leader" | "assistant";
};

export type StudentPortfolioCard = {
  id: string;
  sequenceOrder: number;
  portfolioType: StudentCategory;
  workflowStatus: PortfolioWorkflowStatus;
  leaderStudentId: string;
  leaderName: string;
  participants: PortfolioParticipantView[];
  assistantAvailability: AssistantAvailabilityChoice[];
  booking: ConfirmedStudioBooking | null;
  submission: PortfolioSubmissionView | null;
  lockedReason: string | null;
  revisionReturnTo: PortfolioRevisionRoute | null;
};

export type StudentPortfolioPageData = {
  teamId: string;
  teamName: string;
  programName: string | null;
  currentStageNumber: number | null;
  currentStudentId: string;
  currentStudentName: string;
  ownPortfolioOutput: StudentPortfolioCard | null;
  teamPortfolioProgress: StudentPortfolioCard[];
  activeTeamPortfolio: StudentPortfolioCard | null;
  portfolios: StudentPortfolioCard[];
  ownPortfolioSubmissionHistory: PortfolioSubmissionVersionView[];
  ownPortfolioRevisionFeedback: PortfolioRevisionFeedback | null;
};

export type StudentPortfolioResult = {
  data: StudentPortfolioPageData | null;
  error: string | null;
};

export type AdminStudioScheduleRow = {
  id: string;
  portfolioOutputId: string;
  bookingDate: string;
  slotCode: StudioSlotCode;
  bookedAt: string;
  teamName: string;
  programName: string | null;
  portfolioType: StudentCategory;
  leaderName: string;
  verificationStatus: "online_confirmed" | "physically_verified" | "no_show";
  physicallyVerifiedAt: string | null;
  noShowRemarks: string | null;
};

export type AdminStudioScheduleResult = {
  rows: AdminStudioScheduleRow[];
  error: string | null;
};

export type EducatorStudioBookingRow = {
  id: string;
  bookingDate: string;
  slotCode: StudioSlotCode;
  bookedAt: string;
  teamName: string;
  portfolioType: StudentCategory;
  leaderName: string;
};

export type EducatorStudioBookingsResult = {
  rows: EducatorStudioBookingRow[];
  error: string | null;
};
