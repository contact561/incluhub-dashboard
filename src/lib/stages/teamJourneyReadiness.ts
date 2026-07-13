import type { AdminTeamDetail } from "@/types/admin-records";
import type { StudentCategory } from "@/types/database";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";

export type TeamJourneyState =
  | "not_started"
  | "setup_incomplete"
  | "ready_to_start"
  | "in_progress"
  | "completed";

const REQUIRED_CATEGORIES: StudentCategory[] = [
  "makeup_artist",
  "photographer",
  "hairstylist",
];

const categoryToEducatorType = {
  makeup_artist: "makeup_educator",
  photographer: "photography_educator",
  hairstylist: "hairstyling_educator",
} as const;

export type TeamJourneyAssessment = {
  state: TeamJourneyState;
  issues: string[];
  canEnroll: boolean;
  buttonLabel: "Start Stage Journey" | "Enroll in Stage Journey" | null;
};

export function assessTeamJourneyReadiness(
  team: AdminTeamDetail,
  journeyEnrolled: boolean
): TeamJourneyAssessment {
  if (journeyEnrolled) {
    const completed =
      team.currentStageNumber === 5 && team.stageStatus === "completed";

    return {
      state: completed ? "completed" : "in_progress",
      issues: [],
      canEnroll: false,
      buttonLabel: null,
    };
  }

  const issues: string[] = [];
  const activeStudents = team.students;

  if (activeStudents.length !== 3) {
    if (activeStudents.length > 3) {
      issues.push("Team has more than three active students");
    } else {
      issues.push("The team must contain exactly three active students");
    }
  }

  const categoryCounts = new Map<StudentCategory, number>();
  for (const student of activeStudents) {
    categoryCounts.set(
      student.category,
      (categoryCounts.get(student.category) ?? 0) + 1
    );
  }

  for (const category of REQUIRED_CATEGORIES) {
    const count = categoryCounts.get(category) ?? 0;
    if (count === 0) {
      issues.push(`Missing ${STUDENT_CATEGORY_LABELS[category]}`);
    } else if (count > 1) {
      issues.push(`Duplicate ${STUDENT_CATEGORY_LABELS[category]}`);
    }
  }

  for (const student of activeStudents) {
    if (!student.educator) {
      issues.push(`${STUDENT_CATEGORY_LABELS[student.category]} educator not assigned`);
      continue;
    }

    const expectedType = categoryToEducatorType[student.category];
    if (student.educator.educatorType !== expectedType) {
      issues.push("Educator category does not match the student category");
    }

    if (
      student.institute &&
      student.educator.institute &&
      student.institute !== student.educator.institute
    ) {
      issues.push("Educator and student institute mapping is invalid");
    }
  }

  const uniqueIssues = [...new Set(issues)];
  const canEnroll = uniqueIssues.length === 0 && activeStudents.length === 3;
  const hasStaleStageNumber = team.currentStageNumber !== null;

  let state: TeamJourneyState;
  if (canEnroll) {
    state = "ready_to_start";
  } else if (activeStudents.length === 0) {
    state = "not_started";
  } else {
    state = "setup_incomplete";
  }

  return {
    state,
    issues: uniqueIssues,
    canEnroll,
    buttonLabel: canEnroll
      ? hasStaleStageNumber
        ? "Enroll in Stage Journey"
        : "Start Stage Journey"
      : null,
  };
}

export const TEAM_JOURNEY_STATE_LABELS: Record<TeamJourneyState, string> = {
  not_started: "Not started",
  setup_incomplete: "Setup incomplete",
  ready_to_start: "Ready to start",
  in_progress: "In progress",
  completed: "Completed",
};
