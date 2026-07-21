"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export type ApproveEcosystemAccessState = {
  error?: string;
  success?: string;
};

const GENERIC_ERROR = "Ecosystem access could not be approved.";

function mapRpcError(message: string): string {
  if (
    /could not find the function/i.test(message) ||
    /function .*approve_student_ecosystem_access.* does not exist/i.test(message) ||
    /column .*ecosystem_access_.* does not exist/i.test(message)
  ) {
    return "The required database migration has not been applied.";
  }

  const knownMessages = [
    "You do not have permission to perform this action.",
    "Student was not found.",
    "Student is not active.",
    "Student has not reached Stage 5.",
    "Student is not awaiting ecosystem review.",
  ];

  return knownMessages.find((known) => message.includes(known)) ?? GENERIC_ERROR;
}

export async function approveStudentEcosystemAccessAction(
  _prevState: ApproveEcosystemAccessState,
  formData: FormData
): Promise<ApproveEcosystemAccessState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return { error: "You do not have permission to perform this action." };
  }

  const studentId = formData.get("student_id");
  const teamId = formData.get("team_id");
  if (typeof studentId !== "string" || !studentId.trim()) {
    return { error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_student_ecosystem_access", {
    p_student_id: studentId.trim(),
  });

  if (error) {
    console.error("[approveStudentEcosystemAccessAction]", error.message);
    return { error: mapRpcError(error.message) };
  }

  if (typeof teamId === "string" && teamId.trim()) {
    revalidatePath(`/admin/teams/${teamId.trim()}`);
  }
  revalidatePath("/admin/students");
  revalidatePath("/admin/stages");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/my-stage");
  revalidatePath("/student/ecosystem");
  revalidatePath("/student", "layout");

  return { success: "Ecosystem access approved for this student." };
}
