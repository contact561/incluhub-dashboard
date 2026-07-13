import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";

export const STUDENT_PORTAL_ERRORS = {
  permissionDenied: "You do not have permission to view this information.",
  profileNotFound: "Your student profile could not be found.",
  noTeam: "You are not currently assigned to a team.",
  teamLoadFailed: "Team information could not be loaded.",
  stageLoadFailed: "Stage information could not be loaded.",
  journeyNotStarted: "Your team's stage journey has not started.",
} as const;

export type ActiveStudentTeamContext = {
  studentId: string;
  teamId: string;
  currentStudentName: string;
};

export type ActiveStudentTeamContextResult =
  | { context: ActiveStudentTeamContext; error: null }
  | { context: null; error: string };

export async function resolveActiveStudentTeamContext(): Promise<ActiveStudentTeamContextResult> {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student" || profile.status !== "active") {
    return {
      context: null,
      error: STUDENT_PORTAL_ERRORS.permissionDenied,
    };
  }

  const supabase = await createClient();

  const { data: studentRow, error: studentError } = await supabase
    .from("students")
    .select(
      `
      id,
      current_team_id,
      profiles!user_id (
        full_name
      )
    `
    )
    .eq("user_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (studentError) {
    console.error(
      "[resolveActiveStudentTeamContext] student",
      studentError.message
    );
    return {
      context: null,
      error: STUDENT_PORTAL_ERRORS.teamLoadFailed,
    };
  }

  if (!studentRow) {
    return {
      context: null,
      error: STUDENT_PORTAL_ERRORS.profileNotFound,
    };
  }

  if (!studentRow.current_team_id) {
    return {
      context: null,
      error: STUDENT_PORTAL_ERRORS.noTeam,
    };
  }

  return {
    context: {
      studentId: studentRow.id as string,
      teamId: studentRow.current_team_id as string,
      currentStudentName:
        (studentRow.profiles as { full_name: string } | null)?.full_name ?? "—",
    },
    error: null,
  };
}
