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
  moodboardStatus:
    | "not_submitted"
    | "pending_admin"
    | "revision_required"
    | "approved";
  moodboard: {
    id: string;
    versionNumber: number;
    title: string;
    moodboardUrl: string;
    notes: string | null;
    submittedAt: string;
    reviewComments: string | null;
  } | null;
  educatorComments: {
    id: string;
    authorName: string;
    body: string;
    createdAt: string;
  }[];
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
  bookingDate: string;
  slotCode: StudioSlotCode;
  bookedAt: string;
  teamName: string;
  programName: string | null;
  bookingType: "portfolio" | "personal";
  portfolioType: StudentCategory | null;
  leaderName: string;
  purpose: string | null;
  verificationStatus: "online_confirmed" | "physically_verified" | "no_show";
  physicallyVerifiedAt: string | null;
  noShowRemarks: string | null;
};

export type AdminStudioScheduleResult = {
  rows: AdminStudioScheduleRow[];
  error: string | null;
};

export type PersonalStudioBookingView = {
  id: string;
  bookingDate: string;
  slotCode: StudioSlotCode;
  purpose: string;
  bookedAt: string;
  verificationStatus: "online_confirmed" | "physically_verified" | "no_show";
  physicallyVerifiedAt: string | null;
};

export type PersonalStudioPageData = {
  studentId: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  bookings: PersonalStudioBookingView[];
};

export type PersonalStudioResult = {
  data: PersonalStudioPageData | null;
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
