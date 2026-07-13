"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { parseCreateTeamFormData } from "@/lib/validations/team";

export type CreateTeamState = {
  error?: string;
};

async function requireAdminProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { error: "You must be signed in to create teams." as const };
  }

  if (profile.status !== "active") {
    return { error: "Your account is not active." as const };
  }

  if (profile.role !== "admin") {
    return { error: "Only admins can create teams." as const };
  }

  return { profile };
}

export async function createTeamAction(
  _prevState: CreateTeamState,
  formData: FormData
): Promise<CreateTeamState> {
  const adminCheck = await requireAdminProfile();

  if ("error" in adminCheck) {
    return { error: adminCheck.error };
  }

  const parsed = parseCreateTeamFormData(formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: teamId, error } = await supabase.rpc("create_balanced_team", {
    p_team_name: input.team_name,
    p_program_id: input.program_id,
    p_makeup_artist_student_id: input.makeup_artist_student_id,
    p_photographer_student_id: input.photographer_student_id,
    p_hairstylist_student_id: input.hairstylist_student_id,
    p_makeup_educator_id: input.makeup_educator_id,
    p_photography_educator_id: input.photography_educator_id,
    p_hairstyling_educator_id: input.hairstyling_educator_id,
  });

  if (error) {
    const rpcMissing =
      error.code === "PGRST202" ||
      error.code === "42883" ||
      /could not find the function/i.test(error.message) ||
      /function .*create_balanced_team.* does not exist/i.test(error.message);

    if (rpcMissing) {
      return {
        error:
          "Team creation RPC is not configured. Run supabase/migrations/005_cross_institute_program_teams.sql in Supabase.",
      };
    }

    return { error: error.message };
  }

  if (!teamId) {
    return { error: "Failed to create team." };
  }

  redirect(`/admin/teams/${teamId}`);
}
