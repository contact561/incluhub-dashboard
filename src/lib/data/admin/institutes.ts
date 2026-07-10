import { createClient } from "@/lib/supabase/server";
import type {
  AdminInstituteRow,
  AdminInstitutesResult,
} from "@/types/admin-records";

type InstituteQueryRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

export async function getAdminInstitutes(): Promise<AdminInstitutesResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("institutes")
    .select("id, name, email, phone, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAdminInstitutes]", error.message);
    return {
      institutes: [],
      error: error.message,
    };
  }

  const institutes: AdminInstituteRow[] = (
    (data ?? []) as InstituteQueryRow[]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    createdAt: row.created_at,
  }));

  return { institutes, error: null };
}

export async function getActiveInstituteOptions(): Promise<
  { id: string; name: string }[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("institutes")
    .select("id, name")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    console.error("[getActiveInstituteOptions]", error.message);
    return [];
  }

  return ((data ?? []) as { id: string; name: string }[]).map((row) => ({
    id: row.id,
    name: row.name,
  }));
}
