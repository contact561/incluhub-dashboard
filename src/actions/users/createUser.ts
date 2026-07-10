"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseCreateUserFormData,
  type CreateUserInput,
} from "@/lib/validations/user";

export type CreateUserState = {
  error?: string;
  success?: boolean;
};

async function requireAdminProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { error: "You must be signed in to create users." as const };
  }

  if (profile.status !== "active") {
    return { error: "Your account is not active." as const };
  }

  if (profile.role !== "admin") {
    return { error: "Only admins can create users." as const };
  }

  return { profile };
}

async function rollbackAuthUser(userId: string) {
  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(userId);
  } catch (error) {
    console.error("[createUser] Failed to roll back auth user", userId, error);
  }
}

async function createRoleRecord(
  admin: ReturnType<typeof createAdminClient>,
  input: CreateUserInput,
  userId: string,
  createdBy: string
): Promise<{ error?: string }> {
  switch (input.role) {
    case "admin":
      return {};

    case "student": {
      const { error } = await admin.from("students").insert({
        user_id: userId,
        institute_id: input.institute_id!,
        student_category: input.student_category!,
        payment_status: input.payment_status!,
        status: "active",
        current_stage_number: 0,
        created_by: createdBy,
      });

      if (error) {
        return { error: `Failed to create student record: ${error.message}` };
      }

      return {};
    }

    case "educator": {
      const { error } = await admin.from("educators").insert({
        user_id: userId,
        institute_id: input.institute_id!,
        educator_type: input.educator_type!,
        status: "active",
        created_by: createdBy,
      });

      if (error) {
        return { error: `Failed to create educator record: ${error.message}` };
      }

      return {};
    }

    case "external_member": {
      const { error } = await admin.from("external_members").insert({
        user_id: userId,
        external_member_type: input.external_member_type!,
        status: "active",
        created_by: createdBy,
      });

      if (error) {
        return {
          error: `Failed to create external member record: ${error.message}`,
        };
      }

      return {};
    }

    default: {
      const _exhaustive: never = input.role;
      return { error: `Unsupported role: ${_exhaustive}` };
    }
  }
}

export async function createUserAction(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const adminCheck = await requireAdminProfile();

  if ("error" in adminCheck) {
    return { error: adminCheck.error };
  }

  const parsed = parseCreateUserFormData(formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  const input = parsed.data;
  const admin = createAdminClient();

  if (input.role === "student" || input.role === "educator") {
    const { data: institute, error: instituteError } = await admin
      .from("institutes")
      .select("id")
      .eq("id", input.institute_id!)
      .maybeSingle();

    if (instituteError || !institute) {
      return { error: "Selected institute was not found." };
    }
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name,
        role: input.role,
      },
    });

  if (authError || !authData.user) {
    return {
      error:
        authError?.message ??
        "Failed to create auth user. The email may already be in use.",
    };
  }

  const userId = authData.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    full_name: input.full_name,
    email: input.email,
    phone: input.phone,
    role: input.role,
    status: input.status,
    created_by: adminCheck.profile.id,
  });

  if (profileError) {
    await rollbackAuthUser(userId);
    return {
      error: `Failed to create profile: ${profileError.message}`,
    };
  }

  const roleResult = await createRoleRecord(
    admin,
    input,
    userId,
    adminCheck.profile.id
  );

  if (roleResult.error) {
    await admin.from("profiles").delete().eq("id", userId);
    await rollbackAuthUser(userId);
    return { error: roleResult.error };
  }

  redirect("/admin/users");
}
