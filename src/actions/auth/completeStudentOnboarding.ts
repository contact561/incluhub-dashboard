"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_CATEGORIES } from "@/lib/validations/user";

export type CompleteOnboardingState = {
  error?: string;
};

export async function completeStudentOnboardingAction(
  _prev: CompleteOnboardingState,
  formData: FormData
): Promise<CompleteOnboardingState> {
  const instituteId = String(formData.get("institute_id") ?? "").trim();
  const category = String(formData.get("student_category") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!instituteId) {
    return { error: "Select your institute." };
  }

  if (!STUDENT_CATEGORIES.includes(category as (typeof STUDENT_CATEGORIES)[number])) {
    return { error: "Select a valid category." };
  }

  if (fullName.length < 2) {
    return { error: "Enter your full name." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_student_onboarding", {
    p_institute_id: instituteId,
    p_student_category: category,
    p_full_name: fullName,
    p_phone: phone || null,
  });

  if (error) {
    const known = [
      "Select a valid institute.",
      "Select a valid student category.",
      "Full name is required.",
      "You do not have permission to perform this action.",
    ].find((message) => error.message.includes(message));
    return { error: known ?? "Onboarding could not be completed." };
  }

  revalidatePath("/student", "layout");
  redirect("/student/dashboard");
}
