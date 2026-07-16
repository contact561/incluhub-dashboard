"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export type ScheduleBrandWorksState = {
  error?: string;
  success?: string;
};

const REMARKS_MAX = 2000;
const GENERIC_ERROR = "Brand Works could not be scheduled.";

function mapRpcError(message: string): string {
  if (
    /could not find the function/i.test(message) ||
    /function .*schedule_brand_works.* does not exist/i.test(message) ||
    /column .*brand_works_.* does not exist/i.test(message)
  ) {
    return "The required database migration has not been applied.";
  }

  const knownMessages = [
    "You do not have permission to perform this action.",
    "Brand Works date is required.",
    "Remarks cannot exceed 2000 characters.",
    "Team was not found.",
    "Team is not currently in Stage 4.",
    "Stage 3 is incomplete.",
  ];

  return knownMessages.find((known) => message.includes(known)) ?? GENERIC_ERROR;
}

function revalidateBrandWorksViews(teamId: string) {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/stages");
  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/student/dashboard");
  revalidatePath("/student/my-stage");
  revalidatePath("/educator/my-teams");
}

export async function scheduleBrandWorksAction(
  _prevState: ScheduleBrandWorksState,
  formData: FormData
): Promise<ScheduleBrandWorksState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return { error: "You do not have permission to perform this action." };
  }

  const teamIdRaw = formData.get("team_id");
  const dateRaw = formData.get("brand_works_date");
  const remarksRaw = formData.get("remarks");

  if (typeof teamIdRaw !== "string" || !teamIdRaw.trim()) {
    return { error: GENERIC_ERROR };
  }
  if (typeof dateRaw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return { error: "Brand Works date is required." };
  }

  const remarks = typeof remarksRaw === "string" ? remarksRaw.trim() : "";
  if (remarks.length > REMARKS_MAX) {
    return { error: "Remarks cannot exceed 2000 characters." };
  }

  const teamId = teamIdRaw.trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("schedule_brand_works", {
    p_team_id: teamId,
    p_brand_works_date: dateRaw,
    p_remarks: remarks || null,
  });

  if (error) {
    console.error("[scheduleBrandWorksAction]", error.message);
    return { error: mapRpcError(error.message) };
  }

  revalidateBrandWorksViews(teamId);
  return { success: "Brand Works schedule saved." };
}
