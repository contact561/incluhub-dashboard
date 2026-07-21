"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export type CompleteBrandWorksState = {
  error?: string;
  success?: string;
};

const GENERIC_ERROR = "Brand Works completion could not be recorded.";

function mapRpcError(message: string): string {
  if (
    /could not find the function/i.test(message) ||
    /function .*complete_brand_works.* does not exist/i.test(message) ||
    /column .*brand_works_.* does not exist/i.test(message)
  ) {
    return "The required database migration has not been applied.";
  }

  const knownMessages = [
    "You do not have permission to perform this action.",
    "Team was not found.",
    "Team is not currently in Stage 4.",
    "Stage 3 is incomplete.",
    "Brand Works must be scheduled before completion.",
    "Brand Works cannot be completed before its scheduled date.",
    "Stage progression could not be completed.",
  ];

  return knownMessages.find((known) => message.includes(known)) ?? GENERIC_ERROR;
}

export async function completeBrandWorksAction(
  _prevState: CompleteBrandWorksState,
  formData: FormData
): Promise<CompleteBrandWorksState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return { error: "You do not have permission to perform this action." };
  }

  const teamIdRaw = formData.get("team_id");
  if (typeof teamIdRaw !== "string" || !teamIdRaw.trim()) {
    return { error: GENERIC_ERROR };
  }

  const teamId = teamIdRaw.trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_brand_works", {
    p_team_id: teamId,
  });

  if (error) {
    console.error("[completeBrandWorksAction]", error.message);
    return { error: mapRpcError(error.message) };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/stages");
  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/student/dashboard");
  revalidatePath("/student/my-stage");
  revalidatePath("/educator/my-teams");

  return {
    success:
      "Brand Works completed. The team is now in Stage 5 under review. Approve each student's ecosystem access when ready.",
  };
}
