import { createClient } from "@/lib/supabase/server";
import type { AdminUsersResult, AdminUserRow } from "@/types/admin-records";
import type { UserRole } from "@/types/database";

type ProfileQueryRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: string;
  created_at: string;
};

export async function getAdminUsers(): Promise<AdminUsersResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAdminUsers]", error.message);
    return {
      users: [],
      error: error.message,
    };
  }

  const users: AdminUserRow[] = ((data ?? []) as ProfileQueryRow[]).map(
    (row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
    })
  );

  return { users, error: null };
}
