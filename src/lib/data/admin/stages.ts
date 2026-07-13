import { createClient } from "@/lib/supabase/server";
import type {
  AdminStageBoardData,
  AdminStageBoardResult,
  StageBoardTeamCard,
} from "@/types/stage-management";
import type { StageStatus, StudentCategory } from "@/types/database";

type TeamBoardQueryRow = {
  id: string;
  team_name: string;
  current_stage_number: number;
  stage_status: StageStatus;
  updated_at: string;
  programs: { name: string } | null;
  team_members: Array<{
    student_category: StudentCategory;
    member_status: string;
    students: {
      profiles: { full_name: string } | null;
    } | null;
  }> | null;
};

function mapTeamCard(row: TeamBoardQueryRow): StageBoardTeamCard {
  const activeMembers = (row.team_members ?? []).filter(
    (member) => member.member_status === "active"
  );

  return {
    id: row.id,
    teamName: row.team_name,
    program: row.programs?.name ?? null,
    currentStageNumber: row.current_stage_number,
    stageStatus: row.stage_status,
    updatedAt: row.updated_at,
    students: activeMembers.map((member) => ({
      fullName: member.students?.profiles?.full_name ?? "—",
      category: member.student_category,
    })),
  };
}

export async function getAdminStageBoard(): Promise<AdminStageBoardResult> {
  const supabase = await createClient();

  const [enrollmentsResult, teamsResult] = await Promise.all([
    supabase
      .from("program_enrollments")
      .select(
        `
        program_id,
        status,
        students!student_id (
          id,
          student_category,
          status,
          current_team_id,
          institutes!institute_id (
            name
          ),
          profiles!user_id (
            full_name,
            email
          )
        ),
        programs!program_id (
          name
        )
      `
      )
      .eq("status", "active"),
    supabase
      .from("teams")
      .select(
        `
        id,
        team_name,
        current_stage_number,
        stage_status,
        updated_at,
        status,
        programs!program_id (
          name
        ),
        team_members (
          student_category,
          member_status,
          students!student_id (
            profiles!user_id (
              full_name
            )
          )
        )
      `
      )
      .eq("status", "active")
      .order("updated_at", { ascending: false }),
  ]);

  const firstError =
    enrollmentsResult.error?.message || teamsResult.error?.message || null;

  if (firstError) {
    console.error("[getAdminStageBoard]", firstError);
    return { data: null, error: firstError };
  }

  const awaitingAssignment = (
    (enrollmentsResult.data ?? []) as Array<{
      program_id: string;
      students: {
        id: string;
        student_category: StudentCategory;
        status: string;
        current_team_id: string | null;
        institutes: { name: string } | null;
        profiles: { full_name: string; email: string } | null;
      } | null;
      programs: { name: string } | null;
    }>
  )
    .filter(
      (row) =>
        row.students &&
        row.students.status === "active" &&
        row.students.current_team_id === null
    )
    .map((row) => ({
      id: row.students!.id,
      fullName: row.students!.profiles?.full_name ?? "—",
      email: row.students!.profiles?.email ?? "—",
      category: row.students!.student_category,
      institute: row.students!.institutes?.name ?? null,
      programId: row.program_id,
      programName: row.programs?.name ?? "—",
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const teams = ((teamsResult.data ?? []) as TeamBoardQueryRow[]).map(
    mapTeamCard
  );

  const data: AdminStageBoardData = {
    awaitingAssignment,
    stage2Teams: teams.filter((team) => team.currentStageNumber === 2),
    stage3Teams: teams.filter((team) => team.currentStageNumber === 3),
    stage4Teams: teams.filter((team) => team.currentStageNumber === 4),
    stage5Teams: teams.filter((team) => team.currentStageNumber === 5),
  };

  return { data, error: null };
}
