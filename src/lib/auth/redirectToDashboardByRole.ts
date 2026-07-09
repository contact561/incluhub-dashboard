import { redirect } from "next/navigation";
import type { UserRole } from "@/types/database";
import { getDashboardPathForRole } from "@/lib/auth/getDashboardPathForRole";

export function redirectToDashboardByRole(role: UserRole): never {
  redirect(getDashboardPathForRole(role));
}
