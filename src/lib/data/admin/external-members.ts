import { createClient } from "@/lib/supabase/server";
import type { AdminExternalMemberRow } from "@/types/admin-records";
import type { ExternalMemberType } from "@/types/database";

type ExternalMemberQueryRow = {
  id: string;
  external_member_type: ExternalMemberType;
  status: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
};

function countByKey(rows: { key: string }[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.key, (counts.get(row.key) ?? 0) + 1);
  }

  return counts;
}

export async function getAdminExternalMembers(): Promise<AdminExternalMemberRow[]> {
  const supabase = await createClient();

  const [membersResult, assignmentsResult] = await Promise.all([
    supabase
      .from("external_members")
      .select(
        `
        id,
        external_member_type,
        status,
        profiles!user_id (
          full_name,
          email,
          phone
        )
      `
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("project_assignments")
      .select("external_member_id")
      .eq("status", "active"),
  ]);

  if (membersResult.error) {
    console.error("[getAdminExternalMembers]", membersResult.error.message);
    return [];
  }

  if (assignmentsResult.error) {
    console.error(
      "[getAdminExternalMembers] project counts",
      assignmentsResult.error.message
    );
  }

  const projectCounts = countByKey(
    ((assignmentsResult.data ?? []) as { external_member_id: string }[]).map(
      (row) => ({
        key: row.external_member_id,
      })
    )
  );

  return ((membersResult.data ?? []) as ExternalMemberQueryRow[]).map(
    (row) => ({
      id: row.id,
      name: row.profiles?.full_name ?? "—",
      email: row.profiles?.email ?? "—",
      phone: row.profiles?.phone ?? null,
      externalMemberType: row.external_member_type,
      assignedProjectsCount: projectCounts.get(row.id) ?? 0,
      status: row.status,
    })
  );
}
