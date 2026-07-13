"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";
import { parseEnrollStudentsFormData } from "@/lib/validations/program";

export type EnrollStudentsState = {
  error?: string;
  success?: string;
};

async function requireAdminProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { error: "You must be signed in to enroll students." as const };
  }

  if (profile.status !== "active") {
    return { error: "Your account is not active." as const };
  }

  if (profile.role !== "admin") {
    return { error: "Only admins can enroll students." as const };
  }

  return { profile };
}

export async function enrollStudentsAction(
  _prevState: EnrollStudentsState,
  formData: FormData
): Promise<EnrollStudentsState> {
  const adminCheck = await requireAdminProfile();

  if ("error" in adminCheck) {
    return { error: adminCheck.error };
  }

  const parsed = parseEnrollStudentsFormData(formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  const { program_id, student_ids } = parsed.data;
  const supabase = await createClient();

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, status")
    .eq("id", program_id)
    .maybeSingle();

  if (programError || !program) {
    return { error: "Program was not found." };
  }

  if (program.status !== "active") {
    return { error: "Only active programs can accept enrollments." };
  }

  const { data: participating, error: piError } = await supabase
    .from("program_institutes")
    .select("institute_id")
    .eq("program_id", program_id)
    .eq("status", "active");

  if (piError) {
    return { error: piError.message };
  }

  const instituteIds = new Set(
    (participating ?? []).map((row) => row.institute_id as string)
  );

  if (instituteIds.size === 0) {
    return {
      error: "This program has no participating institutes yet.",
    };
  }

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, institute_id, status")
    .in("id", student_ids);

  if (studentsError || !students || students.length !== student_ids.length) {
    return { error: "One or more selected students were not found." };
  }

  for (const student of students) {
    if (student.status !== "active") {
      return { error: "Only active students can be enrolled." };
    }
    if (!instituteIds.has(student.institute_id as string)) {
      return {
        error:
          "Each student must belong to a participating institute in this program.",
      };
    }
  }

  const rows = student_ids.map((studentId) => ({
    program_id,
    student_id: studentId,
    status: "active" as const,
    created_by: adminCheck.profile.id,
  }));

  const { error: insertError } = await supabase
    .from("program_enrollments")
    .upsert(rows, { onConflict: "program_id,student_id" });

  if (insertError) {
    return { error: `Failed to enroll students: ${insertError.message}` };
  }

  revalidatePath(`/admin/programs/${program_id}`);
  revalidatePath("/admin/teams/create");

  return {
    success: `Enrolled ${student_ids.length} student${student_ids.length === 1 ? "" : "s"}.`,
  };
}
