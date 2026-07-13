import type { TeamStageTimelineEntry, TeamPortfolioSummary } from "@/types/stage-management";
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
