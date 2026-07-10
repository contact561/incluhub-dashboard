import { createClient } from "@/lib/supabase/server";
import type {
  AdminProgramRow,
  AdminProgramsResult,
} from "@/types/admin-records";

type ProgramQueryRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  institutes: {
    name: string;
  } | null;
};

export async function getAdminPrograms(): Promise<AdminProgramsResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("programs")
    .select(
      `
      id,
      name,
      start_date,
      end_date,
      status,
      institutes!institute_id (
        name
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAdminPrograms]", error.message);
    return {
      programs: [],
      error: error.message,
    };
  }

  const programs: AdminProgramRow[] = ((data ?? []) as ProgramQueryRow[]).map(
    (row) => ({
      id: row.id,
      name: row.name,
      institute: row.institutes?.name ?? null,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
    })
  );

  return { programs, error: null };
}
