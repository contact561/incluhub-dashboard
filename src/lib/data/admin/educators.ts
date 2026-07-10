import { createClient } from "@/lib/supabase/server";
import type { AdminEducatorRow } from "@/types/admin-records";
import type { EducatorType } from "@/types/database";

type EducatorQueryRow = {
  id: string;
  educator_type: EducatorType;
  status: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  institutes: {
    name: string;
  } | null;
};

function countByKey(rows: { key: string }[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.key, (counts.get(row.key) ?? 0) + 1);
  }

  return counts;
}

export async function getAdminEducators(): Promise<AdminEducatorRow[]> {
  const supabase = await createClient();

  const [educatorsResult, teamAssignmentsResult] = await Promise.all([
    supabase
      .from("educators")
      .select(
        `
        id,
        educator_type,
        status,
        profiles!user_id (
          full_name,
          email,
          phone
        ),
        institutes!institute_id (
          name
        )
      `
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("team_educators")
      .select("educator_id")
      .eq("status", "active"),
  ]);

  if (educatorsResult.error) {
    console.error("[getAdminEducators]", educatorsResult.error.message);
    return [];
  }

  if (teamAssignmentsResult.error) {
    console.error(
      "[getAdminEducators] team counts",
      teamAssignmentsResult.error.message
    );
  }

  const teamCounts = countByKey(
    ((teamAssignmentsResult.data ?? []) as { educator_id: string }[]).map(
      (row) => ({
        key: row.educator_id,
      })
    )
  );

  return ((educatorsResult.data ?? []) as EducatorQueryRow[]).map((row) => ({
    id: row.id,
    name: row.profiles?.full_name ?? "—",
    email: row.profiles?.email ?? "—",
    phone: row.profiles?.phone ?? null,
    educatorType: row.educator_type,
    institute: row.institutes?.name ?? null,
    assignedTeamsCount: teamCounts.get(row.id) ?? 0,
    status: row.status,
  }));
}
