import type { TeamStageTimelineEntry, TeamPortfolioSummary } from "@/types/stage-management";
import type { StudentPortfolioCard } from "@/types/studio-booking";
import type {
  PortfolioRevisionFeedback,
  PortfolioSubmissionVersionView,
} from "@/types/portfolio-submission";
import type {
  EducatorType,
  StageStatus,
  StudentCategory,
} from "@/types/database";

export type StudentTeamEducatorView = {
  fullName: string;
  educatorType: EducatorType;
};

export type StudentTeamMemberView = {
  studentId: string;
  fullName: string;
  category: StudentCategory;
  isCurrentStudent: boolean;
  educator: StudentTeamEducatorView | null;
};

export type StudentMyTeamData = {
  teamId: string;
  teamName: string;
  programName: string | null;
  teamStatus: "active" | "completed" | "paused";
  currentStageNumber: number | null;
  stageStatus: StageStatus;
  members: StudentTeamMemberView[];
  isIncompleteTeam: boolean;
};

export type StudentMyTeamResult = {
  data: StudentMyTeamData | null;
  error: string | null;
};

export type StudentMyStageData = {
  teamName: string;
  programName: string | null;
  currentStageNumber: number | null;
  currentStageName: string | null;
  currentStageStatus: StageStatus | "not_started";
  timeline: TeamStageTimelineEntry[];
  portfolios: TeamPortfolioSummary[];
  journeyEnrolled: boolean;
};

export type StudentMyStageResult = {
  data: StudentMyStageData | null;
  error: string | null;
};

export type StudentStage3PortfolioContext = {
  teamId: string;
  teamName: string;
  programName: string | null;
  currentStageNumber: number | null;
  currentStudentId: string;
  currentStudentName: string;
  ownPortfolioOutput: StudentPortfolioCard | null;
  teamPortfolioProgress: StudentPortfolioCard[];
  activeTeamPortfolio: StudentPortfolioCard | null;
  ownPortfolioSubmissionHistory: PortfolioSubmissionVersionView[];
  ownPortfolioRevisionFeedback: PortfolioRevisionFeedback | null;
};

export type StudentDashboardData = {
  teamName: string;
  programName: string | null;
  currentStageNumber: number | null;
  currentStudentId: string;
  ownPortfolioOutput: StudentPortfolioCard | null;
  activeTeamPortfolio: StudentPortfolioCard | null;
  teamPortfolioProgress: StudentPortfolioCard[];
  brandWorks: {
    date: string | null;
    remarks: string | null;
    scheduledAt: string | null;
    completedAt: string | null;
  } | null;
};

export type StudentDashboardResult = {
  data: StudentDashboardData | null;
  error: string | null;
};
