import { cache } from "react";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export type StudentEcosystemAccess =
  | {
      status: "granted";
      studentName: string;
      teamName: string;
      programName: string | null;
      currentStageNumber: number;
    }
  | {
      status: "locked";
      currentStageNumber: number | null;
    }
  | {
      status: "under_review";
      studentName: string;
      teamName: string;
      programName: string | null;
      currentStageNumber: 5;
    }
  | {
      status: "error";
      message: string;
    };

export const getStudentEcosystemAccess = cache(
  async (): Promise<StudentEcosystemAccess> => {
    const profile = await getCurrentProfile();

    if (!profile || profile.role !== "student" || profile.status !== "active") {
      return {
        status: "error",
        message: "You do not have permission to view this page.",
      };
    }

    const supabase = await createClient();
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("current_stage_number, current_team_id")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .maybeSingle();

    if (studentError) {
      console.error("[getStudentEcosystemAccess] student", studentError.message);
      return {
        status: "error",
        message: "Your ecosystem access could not be verified.",
      };
    }

    const currentStageNumber = student?.current_stage_number ?? null;

    if (!student || (currentStageNumber ?? 0) < 5) {
      return {
        status: "locked",
        currentStageNumber,
      };
    }

    if (!student.current_team_id) {
      return {
        status: "error",
        message: "Your active team could not be found.",
      };
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select(
        `
        team_name,
        current_stage_number,
        programs!program_id (
          name
        )
      `
      )
      .eq("id", student.current_team_id)
      .eq("status", "active")
      .maybeSingle();

    if (teamError) {
      console.error("[getStudentEcosystemAccess] team", teamError.message);
      return {
        status: "error",
        message: "Your ecosystem access could not be verified.",
      };
    }

    if (!team || (team.current_stage_number ?? 0) < 5) {
      return {
        status: "locked",
        currentStageNumber,
      };
    }

    const { data: stage5, error: stage5Error } = await supabase
      .from("team_stage_progress")
      .select("status, admin_approval_status")
      .eq("team_id", student.current_team_id)
      .eq("stage_number", 5)
      .maybeSingle();

    if (stage5Error || !stage5) {
      console.error("[getStudentEcosystemAccess] stage5", stage5Error?.message);
      return {
        status: "error",
        message: "Your final review status could not be verified.",
      };
    }

    const identity = {
      studentName: profile.full_name,
      teamName: team.team_name,
      programName: (team.programs as { name: string } | null)?.name ?? null,
      currentStageNumber: 5 as const,
    };

    if (
      stage5.status !== "completed" ||
      stage5.admin_approval_status !== "approved"
    ) {
      return { status: "under_review", ...identity };
    }

    return {
      status: "granted",
      ...identity,
    };
  }
);
