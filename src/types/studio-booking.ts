import type { StudioSlotCode } from "@/lib/constants/studioSlots";
import type {
  PortfolioWorkflowStatus,
  StudentCategory,
} from "@/types/database";

export type StudioSlotAvailability = {
  slotCode: StudioSlotCode;
  available: boolean;
};

export type ConfirmedStudioBooking = {
  portfolioOutputId: string;
  bookingDate: string;
  slotCode: StudioSlotCode;
  bookedAt: string;
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
  booking: ConfirmedStudioBooking | null;
  lockedReason: string | null;
};

export type StudentPortfolioPageData = {
  teamId: string;
  teamName: string;
  programName: string | null;
  currentStageNumber: number;
  currentStudentId: string;
  currentStudentName: string;
  portfolios: StudentPortfolioCard[];
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
  portfolioType: StudentCategory;
  leaderName: string;
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
