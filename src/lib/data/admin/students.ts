import { createClient } from "@/lib/supabase/server";
import type { AdminStudentRow } from "@/types/admin-records";
import type { PaymentStatus, StudentCategory } from "@/types/database";

type StudentQueryRow = {
  id: string;
  student_category: StudentCategory;
  payment_status: PaymentStatus;
  current_stage_number: number;
  status: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  institutes: {
    name: string;
  } | null;
  teams: {
    team_name: string;
  } | null;
};

export async function getAdminStudents(): Promise<AdminStudentRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .select(
      `
      id,
      student_category,
      payment_status,
      current_stage_number,
      status,
      profiles!user_id (
        full_name,
        email,
        phone
      ),
      institutes!institute_id (
        name
      ),
      teams!current_team_id (
        team_name
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAdminStudents]", error.message);
    return [];
  }

  return ((data ?? []) as StudentQueryRow[]).map((row) => ({
    id: row.id,
    name: row.profiles?.full_name ?? "—",
    email: row.profiles?.email ?? "—",
    phone: row.profiles?.phone ?? null,
    studentCategory: row.student_category,
    institute: row.institutes?.name ?? null,
    currentTeam: row.teams?.team_name ?? null,
    currentStageNumber: row.current_stage_number,
    paymentStatus: row.payment_status,
    status: row.status,
  }));
}
