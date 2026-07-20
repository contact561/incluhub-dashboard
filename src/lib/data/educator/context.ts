import { logEducatorLoaderError } from "@/lib/data/educator/loader-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioWorkflowStatus, StudentCategory } from "@/types/database";

const CONTEXT_LOADER = "getEducatorContext";
const PORTFOLIO_LOADER = "loadPortfoliosForMappedLeaders";

export type EducatorMappingRow = {
  teamId: string;
  studentId: string;
  teamName: string;
  teamStatus: string;
  currentStageNumber: number | null;
  stageStatus: string;
  studentName: string;
  studentCategory: StudentCategory;
  studentStageNumber: number | null;
};

export type EducatorContext = {
  userId: string;
  educatorId: string;
  mappings: EducatorMappingRow[];
  mappedStudentIds: string[];
  mappedTeamIds: string[];
};

type TeamEducatorRow = {
  team_id: string;
  student_id: string;
};

type TeamRow = {
  id: string;
  team_name: string;
  status: string;
  current_stage_number: number | null;
  stage_status: string;
};

type StudentRow = {
  id: string;
  user_id: string;
  student_category: StudentCategory;
  current_stage_number: number | null;
  status: string;
};

type StudentProfileRow = {
  id: string;
  full_name: string;
};

function missingIds(expected: string[], found: Set<string>): string[] {
  return expected.filter((id) => !found.has(id));
}

/**
 * Active educator + active team_educators rows for the authenticated user.
 * Uses stepwise queries — no nested profile joins (student profiles are not
 * readable by educators under current RLS).
 */
export async function getEducatorContext(): Promise<{
  context: EducatorContext | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { context: null, error: "You do not have permission to view this page." };
  }

  const { data: educator, error: educatorError } = await supabase
    .from("educators")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (educatorError) {
    logEducatorLoaderError(CONTEXT_LOADER, educatorError.message);
    return { context: null, error: educatorError.message };
  }

  if (!educator) {
    return { context: null, error: "Your educator profile could not be found." };
  }

  const { data: mappingRows, error: mappingError } = await supabase
    .from("team_educators")
    .select("team_id, student_id")
    .eq("educator_id", educator.id)
    .eq("status", "active");

  if (mappingError) {
    logEducatorLoaderError(CONTEXT_LOADER, mappingError.message);
    return { context: null, error: mappingError.message };
  }

  const educatorMappings = (mappingRows ?? []) as TeamEducatorRow[];

  if (educatorMappings.length === 0) {
    return {
      context: {
        userId: user.id,
        educatorId: educator.id,
        mappings: [],
        mappedStudentIds: [],
        mappedTeamIds: [],
      },
      error: null,
    };
  }

  const teamIds = [...new Set(educatorMappings.map((row) => row.team_id))];
  const studentIds = [...new Set(educatorMappings.map((row) => row.student_id))];

  const { data: teamRows, error: teamError } = await supabase
    .from("teams")
    .select("id, team_name, status, current_stage_number, stage_status")
    .in("id", teamIds)
    .eq("status", "active");

  if (teamError) {
    logEducatorLoaderError(CONTEXT_LOADER, teamError.message);
    return { context: null, error: teamError.message };
  }

  const teams = (teamRows ?? []) as TeamRow[];
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const teamsMissing = missingIds(teamIds, new Set(teams.map((team) => team.id)));
  if (teamsMissing.length > 0) {
    const message =
      "Assigned team records could not be loaded. Check team status and educator mapping.";
    logEducatorLoaderError(
      CONTEXT_LOADER,
      `${message} missingTeamIds=${teamsMissing.length}`
    );
    return { context: null, error: message };
  }

  const { data: studentRows, error: studentError } = await supabase
    .from("students")
    .select("id, user_id, student_category, current_stage_number, status")
    .in("id", studentIds)
    .eq("status", "active");

  if (studentError) {
    logEducatorLoaderError(CONTEXT_LOADER, studentError.message);
    return { context: null, error: studentError.message };
  }

  const students = (studentRows ?? []) as StudentRow[];
  const studentById = new Map(students.map((student) => [student.id, student]));

  const studentsMissing = missingIds(
    studentIds,
    new Set(students.map((student) => student.id))
  );
  if (studentsMissing.length > 0) {
    const message =
      "Assigned student records could not be loaded. Check student status and educator mapping.";
    logEducatorLoaderError(
      CONTEXT_LOADER,
      `${message} missingStudentIds=${studentsMissing.length}`
    );
    return { context: null, error: message };
  }

  // Profiles are not educator-readable under RLS. Use the server-only admin
  // client only after the signed-in educator and their active mappings have
  // been resolved, and restrict the lookup to those mapped student user IDs.
  const studentUserIds = [
    ...new Set(students.map((student) => student.user_id)),
  ];
  let studentProfileRows: StudentProfileRow[] = [];

  try {
    const admin = createAdminClient();
    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", studentUserIds);

    if (profileError) {
      logEducatorLoaderError(CONTEXT_LOADER, profileError.message);
      return {
        context: null,
        error: "Assigned student names could not be loaded.",
      };
    }

    studentProfileRows = (profileRows ?? []) as StudentProfileRow[];
  } catch (error) {
    logEducatorLoaderError(
      CONTEXT_LOADER,
      error instanceof Error ? error.message : "Student profile lookup failed."
    );
    return {
      context: null,
      error: "Assigned student names could not be loaded.",
    };
  }

  const profileByUserId = new Map(
    studentProfileRows.map((profile) => [profile.id, profile.full_name])
  );
  const profilesMissing = missingIds(
    studentUserIds,
    new Set(studentProfileRows.map((profile) => profile.id))
  );

  if (profilesMissing.length > 0) {
    const message = "Assigned student names could not be loaded.";
    logEducatorLoaderError(
      CONTEXT_LOADER,
      `${message} missingProfileIds=${profilesMissing.length}`
    );
    return { context: null, error: message };
  }

  const mappings: EducatorMappingRow[] = educatorMappings
    .map((row) => {
      const team = teamById.get(row.team_id);
      const student = studentById.get(row.student_id);
      if (!team || !student) return null;
      return {
        teamId: row.team_id,
        studentId: row.student_id,
        teamName: team.team_name,
        teamStatus: team.status,
        currentStageNumber: team.current_stage_number,
        stageStatus: team.stage_status,
        studentName: profileByUserId.get(student.user_id)!,
        studentCategory: student.student_category,
        studentStageNumber: student.current_stage_number,
      };
    })
    .filter((row): row is EducatorMappingRow => row !== null);

  return {
    context: {
      userId: user.id,
      educatorId: educator.id,
      mappings,
      mappedStudentIds: [...new Set(mappings.map((m) => m.studentId))],
      mappedTeamIds: [...new Set(mappings.map((m) => m.teamId))],
    },
    error: null,
  };
}

export function isMatchingPortfolioLeader(
  context: EducatorContext,
  teamId: string,
  leaderStudentId: string
): boolean {
  return context.mappings.some(
    (m) => m.teamId === teamId && m.studentId === leaderStudentId
  );
}

export type PortfolioLite = {
  id: string;
  teamId: string;
  leaderStudentId: string;
  portfolioType: StudentCategory;
  workflowStatus: PortfolioWorkflowStatus;
  portfolioTitle: string | null;
  submittedAt: string | null;
};

type LoadPortfoliosOptions = {
  workflowStatus?: PortfolioWorkflowStatus;
};

export async function loadPortfoliosForMappedLeaders(
  context: EducatorContext,
  options: LoadPortfoliosOptions = {}
): Promise<{ portfolios: PortfolioLite[]; error: string | null }> {
  if (context.mappedTeamIds.length === 0 || context.mappedStudentIds.length === 0) {
    return { portfolios: [], error: null };
  }

  const supabase = await createClient();
  let query = supabase
    .from("portfolio_outputs")
    .select(
      `
      id,
      team_id,
      leader_student_id,
      portfolio_type,
      workflow_status,
      portfolio_title,
      submitted_at
    `
    )
    .in("team_id", context.mappedTeamIds)
    .in("leader_student_id", context.mappedStudentIds);

  if (options.workflowStatus) {
    query = query.eq("workflow_status", options.workflowStatus);
  }

  const { data, error } = await query;

  if (error) {
    logEducatorLoaderError(PORTFOLIO_LOADER, error.message);
    return { portfolios: [], error: error.message };
  }

  const portfolios = ((data ?? []) as Array<{
    id: string;
    team_id: string;
    leader_student_id: string;
    portfolio_type: StudentCategory;
    workflow_status: PortfolioWorkflowStatus | null;
    portfolio_title: string | null;
    submitted_at: string | null;
  }>)
    .filter(
      (row) =>
        row.workflow_status !== null &&
        isMatchingPortfolioLeader(context, row.team_id, row.leader_student_id)
    )
    .map((row) => ({
      id: row.id,
      teamId: row.team_id,
      leaderStudentId: row.leader_student_id,
      portfolioType: row.portfolio_type,
      workflowStatus: row.workflow_status as PortfolioWorkflowStatus,
      portfolioTitle: row.portfolio_title,
      submittedAt: row.submitted_at,
    }));

  return { portfolios, error: null };
}

export async function loadTeamRecord(
  teamId: string
): Promise<{ team: TeamRow | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, team_name, status, current_stage_number, stage_status")
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    logEducatorLoaderError("loadTeamRecord", error.message);
    return { team: null, error: error.message };
  }

  return { team: (data as TeamRow | null) ?? null, error: null };
}
