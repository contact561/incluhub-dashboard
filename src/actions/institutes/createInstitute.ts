"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { parseCreateInstituteFormData } from "@/lib/validations/institute";

export type CreateInstituteState = {
  error?: string;
};

async function requireAdminProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { error: "You must be signed in to create institutes." as const };
  }

  if (profile.status !== "active") {
    return { error: "Your account is not active." as const };
  }

  if (profile.role !== "admin") {
    return { error: "Only admins can create institutes." as const };
  }

  return { profile };
}

export async function createInstituteAction(
  _prevState: CreateInstituteState,
  formData: FormData
): Promise<CreateInstituteState> {
  const adminCheck = await requireAdminProfile();

  if ("error" in adminCheck) {
    return { error: adminCheck.error };
  }

  const parsed = parseCreateInstituteFormData(formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("institutes").insert({
    name: input.name,
    address: input.address,
    phone: input.phone,
    email: input.email,
    website_or_social: input.website_or_social,
    authorized_person_name: input.authorized_person_name,
    status: input.status,
    created_by: adminCheck.profile.id,
  });

  if (error) {
    return { error: `Failed to create institute: ${error.message}` };
  }

  redirect("/admin/institutes");
}
