"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { parseCreateProgramFormData } from "@/lib/validations/program";

export type CreateProgramState = {
  error?: string;
};

async function requireAdminProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { error: "You must be signed in to create programs." as const };
  }

  if (profile.status !== "active") {
    return { error: "Your account is not active." as const };
  }

  if (profile.role !== "admin") {
    return { error: "Only admins can create programs." as const };
  }

  return { profile };
}

export async function createProgramAction(
  _prevState: CreateProgramState,
  formData: FormData
): Promise<CreateProgramState> {
  const adminCheck = await requireAdminProfile();

  if ("error" in adminCheck) {
    return { error: adminCheck.error };
  }

  const parsed = parseCreateProgramFormData(formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: programId, error } = await supabase.rpc(
    "create_program_with_institutes",
    {
      p_name: input.name,
      p_description: input.description,
      p_start_date: input.start_date,
      p_end_date: input.end_date,
      p_status: input.status,
      p_institute_ids: input.institute_ids,
    }
  );

  if (error) {
    const rpcMissing =
      error.code === "PGRST202" ||
      error.code === "42883" ||
      /could not find the function/i.test(error.message) ||
      /function .*create_program_with_institutes.* does not exist/i.test(
        error.message
      );

    if (rpcMissing) {
      return {
        error:
          "Program creation RPC is not configured. Run supabase/migrations/005_cross_institute_program_teams.sql in Supabase.",
      };
    }

    return { error: error.message };
  }

  if (!programId) {
    return { error: "Failed to create program." };
  }

  redirect(`/admin/programs/${programId}`);
}
