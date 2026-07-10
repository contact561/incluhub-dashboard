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

  const { data: institute, error: instituteError } = await supabase
    .from("institutes")
    .select("id")
    .eq("id", input.institute_id)
    .maybeSingle();

  if (instituteError || !institute) {
    return { error: "Selected institute was not found." };
  }

  const { error } = await supabase.from("programs").insert({
    institute_id: input.institute_id,
    name: input.name,
    description: input.description,
    start_date: input.start_date,
    end_date: input.end_date,
    status: input.status,
    created_by: adminCheck.profile.id,
  });

  if (error) {
    return { error: `Failed to create program: ${error.message}` };
  }

  redirect("/admin/programs");
}
