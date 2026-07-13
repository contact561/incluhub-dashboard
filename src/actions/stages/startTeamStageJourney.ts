"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export type StartTeamStageJourneyState = {
  error?: string;
  success?: string;
};

async function requireAdminProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return {
      error: "You do not have permission to perform this action." as const,
    };
  }

  if (profile.status !== "active") {
    return { error: "Your account is not active." as const };
  }

  if (profile.role !== "admin") {
    return {
      error: "You do not have permission to perform this action." as const,
    };
  }

  return { profile };
}

function mapRpcError(message: string): string {
  const rpcMissing =
    /could not find the function/i.test(message) ||
    /function .*start_team_stage_journey.* does not exist/i.test(message);

  if (rpcMissing) {
    return "Database migration has not been applied.";
  }

  const knownMessages = [
    "You do not have permission to perform this action.",
    "Team was not found.",
    "Team is inactive.",
    "This team already has an active stage journey.",
    "The team must contain exactly three active students.",
    "The team must contain one Makeup Artist, one Photographer and one Hairstylist.",
    "Every student must have a matching educator before the journey can begin.",
    "Educator category does not match the student category.",
    "Educator and student institute mapping is invalid.",
    "Stage initialization is incomplete.",
  ];

  const match = knownMessages.find((known) => message.includes(known));
  return match ?? "Stage initialization is incomplete.";
}

export async function startTeamStageJourneyAction(
  _prevState: StartTeamStageJourneyState,
  formData: FormData
): Promise<StartTeamStageJourneyState> {
  const adminCheck = await requireAdminProfile();

  if ("error" in adminCheck) {
    return { error: adminCheck.error };
  }

  const teamId = formData.get("team_id");

  if (typeof teamId !== "string" || !teamId.trim()) {
    return { error: "Team was not found." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("start_team_stage_journey", {
    p_team_id: teamId,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath("/admin/stages");
  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${teamId}`);

  return {
    success:
      "Stage journey started successfully. The team is now in Stage 2.",
  };
}
