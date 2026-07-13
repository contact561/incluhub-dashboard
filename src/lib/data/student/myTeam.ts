import { createClient } from "@/lib/supabase/server";
import {
  resolveActiveStudentTeamContext,
  STUDENT_PORTAL_ERRORS,
} from "@/lib/data/student/activeTeamContext";
import type {
  StudentMyTeamData,
  StudentMyTeamResult,
  StudentTeamMemberView,
} from "@/types/student-portal";
import type { EducatorType, StageStatus, StudentCategory } from "@/types/database";

export async function getStudentMyTeamPageData(): Promise<StudentMyTeamResult> {
  const { context, error: contextError } =
    await resolveActiveStudentTeamContext();

  if (contextError || !context) {
    return { data: null, error: contextError };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select(
      `
      id,
      team_name,
      current_stage_number,
      stage_status,
      status,
      programs!program_id (
        name
      ),
      team_members (
        student_id,
        student_category,
        member_status,
        students!student_id (
          id,
          profiles!user_id (
            full_name
          )
        )
      ),
      team_educators (
        student_id,
        educator_type,
        status,
        educators!educator_id (
          profiles!user_id (
            full_name
          )
        )
      )
    `
    )
    .eq("id", context.teamId)
    .maybeSingle();

  if (error) {
    console.error("[getStudentMyTeamPageData]", error.message);
    return { data: null, error: STUDENT_PORTAL_ERRORS.teamLoadFailed };
  }

  if (!data) {
    return { data: null, error: STUDENT_PORTAL_ERRORS.noTeam };
  }

  const row = data as {
    id: string;
    team_name: string;
    current_stage_number: number | null;
    stage_status: StageStatus;
    status: "active" | "completed" | "paused";
    programs: { name: string } | null;
    team_members: Array<{
      student_id: string;
      student_category: StudentCategory;
      member_status: string;
      students: {
        id: string;
        profiles: { full_name: string } | null;
      } | null;
    }> | null;
    team_educators: Array<{
      student_id: string;
      educator_type: EducatorType;
      status: string;
      educators: {
        profiles: { full_name: string } | null;
      } | null;
    }> | null;
  };

  const educatorsByStudent = new Map(
    (row.team_educators ?? [])
      .filter((assignment) => assignment.status === "active")
      .map((assignment) => [assignment.student_id, assignment])
  );

  const members: StudentTeamMemberView[] = (row.team_members ?? [])
    .filter((member) => member.member_status === "active")
    .map((member) => {
      const educator = educatorsByStudent.get(member.student_id);

      return {
        studentId: member.student_id,
        fullName: member.students?.profiles?.full_name ?? "—",
        category: member.student_category,
        isCurrentStudent: member.student_id === context.studentId,
        educator: educator
          ? {
              fullName: educator.educators?.profiles?.full_name ?? "—",
              educatorType: educator.educator_type,
            }
          : null,
      };
    });

  const teamData: StudentMyTeamData = {
    teamId: row.id,
    teamName: row.team_name,
    programName: row.programs?.name ?? null,
    teamStatus: row.status,
    currentStageNumber: row.current_stage_number,
    stageStatus: row.stage_status,
    members,
    isIncompleteTeam: members.length < 3,
  };

  return { data: teamData, error: null };
}
