"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export type CompleteBmsSessionState = {
  error?: string;
  success?: string;
};

async function requireAdminProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return {
      error: "You do not have permission to complete this action." as const,
    };
  }

  if (profile.status !== "active") {
    return { error: "Your account is not active." as const };
  }

  if (profile.role !== "admin") {
    return {
      error: "You do not have permission to complete this action." as const,
    };
  }

  return { profile };
}

function mapRpcError(message: string): string {
  const rpcMissing =
    /could not find the function/i.test(message) ||
    /function .*complete_bms_session.* does not exist/i.test(message) ||
    /column .* does not exist/i.test(message) ||
    /type .*portfolio_workflow_status.* does not exist/i.test(message);

  if (rpcMissing) {
    return "Database migration has not been applied. Run 006_stage_bms_foundation.sql in Supabase.";
  }

  const knownMessages = [
    "Team is not currently in Stage 2.",
    "BMS session was already completed.",
    "Stage 1 is incomplete.",
    "Team composition is invalid.",
    "Required educator mapping is missing.",
    "BMS session date is required.",
    "You do not have permission to complete this action.",
    "Portfolio initialization already exists.",
    "Stage skipping is not allowed.",
  ];

  const match = knownMessages.find((known) => message.includes(known));
  return match ?? message;
}

export async function completeBmsSessionAction(
  _prevState: CompleteBmsSessionState,
  formData: FormData
): Promise<CompleteBmsSessionState> {
  const adminCheck = await requireAdminProfile();

  if ("error" in adminCheck) {
    return { error: adminCheck.error };
  }

  const teamId = formData.get("team_id");
  const sessionDate = formData.get("session_date");
  const remarks = formData.get("remarks");

  if (typeof teamId !== "string" || !teamId.trim()) {
    return { error: "Team is required." };
  }

  if (typeof sessionDate !== "string" || !sessionDate.trim()) {
    return { error: "BMS session date is required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("complete_bms_session", {
    p_team_id: teamId,
    p_session_date: sessionDate,
    p_remarks: typeof remarks === "string" ? remarks : null,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath("/admin/stages");
  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${teamId}`);

  return {
    success:
      "BMS session completed. Stage 3 portfolio production has started.",
  };
}
