import { createClient } from "@/lib/supabase/server";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import type { StudentCategory } from "@/types/database";

export type InstituteStudentRow = {
  studentId: string;
  userId: string;
  fullName: string;
  email: string;
  category: StudentCategory;
  instituteId: string;
  currentStageNumber: number | null;
  status: string;
};

export async function getEducatorInstituteStudents(): Promise<{
  rows: InstituteStudentRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_educator_institute_students");

  if (error) {
    if (
      /get_educator_institute_students|Could not find the function/i.test(
        error.message
      )
    ) {
      return {
        rows: [],
        error:
          "Institute roster is not available yet. Apply migration 025 on the experiment database.",
      };
    }
    return { rows: [], error: error.message };
  }

  const rows = (data ?? []).map(
    (row: {
      student_id: string;
      user_id: string;
      full_name: string;
      email: string;
      student_category: StudentCategory;
      institute_id: string;
      current_stage_number: number | null;
      status: string;
    }) => ({
      studentId: row.student_id,
      userId: row.user_id,
      fullName: row.full_name,
      email: row.email,
      category: row.student_category,
      instituteId: row.institute_id,
      currentStageNumber: row.current_stage_number,
      status: row.status,
    })
  );

  return { rows, error: null };
}

export function summarizeInstituteStudents(rows: InstituteStudentRow[]) {
  const byCategory = Object.fromEntries(
    (Object.keys(STUDENT_CATEGORY_LABELS) as StudentCategory[]).map((key) => [
      key,
      0,
    ])
  ) as Record<StudentCategory, number>;

  for (const row of rows) {
    byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
  }

  return { total: rows.length, byCategory };
}
