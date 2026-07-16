import type {
  PortfolioWorkflowStatus,
  StageStatus,
  StudentCategory,
} from "@/types/database";

export type AwaitingAssignmentStudent = {
  id: string;
  fullName: string;
  email: string;
  category: StudentCategory;
  institute: string | null;
  programId: string;
  programName: string;
};

export type StageBoardTeamCard = {
  id: string;
  teamName: string;
  program: string | null;
  currentStageNumber: number | null;
  stageStatus: StageStatus;
  updatedAt: string;
  brandWorksDate: string | null;
  brandWorksRemarks: string | null;
  brandWorksScheduledAt: string | null;
  brandWorksCompletedAt: string | null;
  students: Array<{
    fullName: string;
    category: StudentCategory;
  }>;
};

export type AdminStageBoardData = {
  awaitingAssignment: AwaitingAssignmentStudent[];
  notEnrolledTeams: StageBoardTeamCard[];
  stage2Teams: StageBoardTeamCard[];
  stage3Teams: StageBoardTeamCard[];
  stage4Teams: StageBoardTeamCard[];
  stage5Teams: StageBoardTeamCard[];
};

export type AdminStageBoardResult = {
  data: AdminStageBoardData | null;
  error: string | null;
};

export type TeamStageTimelineEntry = {
  stageNumber: number;
  stageName: string;
  description: string | null;
  status: StageStatus;
  startedAt: string | null;
  completedAt: string | null;
  bmsSessionDate: string | null;
  bmsRemarks: string | null;
  brandWorksDate: string | null;
  brandWorksRemarks: string | null;
  brandWorksScheduledAt: string | null;
  brandWorksScheduledBy: string | null;
  brandWorksCompletedAt: string | null;
  brandWorksCompletedBy: string | null;
  lockedReason: string | null;
};

export type TeamPortfolioSummary = {
  id: string;
  sequenceOrder: number;
  portfolioType: StudentCategory;
  workflowStatus: PortfolioWorkflowStatus;
  leaderName: string;
  submissionTitle: string | null;
  submissionUrl: string | null;
};

export type TeamStageDetail = {
  timeline: TeamStageTimelineEntry[];
  portfolios: TeamPortfolioSummary[];
  stage2InProgress: boolean;
  bmsAlreadyCompleted: boolean;
  stage4InProgress: boolean;
  brandWorksScheduled: boolean;
  brandWorksCompleted: boolean;
  journeyEnrolled: boolean;
};

export type TeamStageDetailResult = {
  detail: TeamStageDetail | null;
  error: string | null;
};
