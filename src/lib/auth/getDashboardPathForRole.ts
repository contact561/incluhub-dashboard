import type { UserRole } from "@/types/database";

const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  student: "/student/dashboard",
  educator: "/educator/dashboard",
  external_member: "/external/dashboard",
};

export function getDashboardPathForRole(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role];
}

export function getRoleForRoutePrefix(pathname: string): UserRole | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/student")) return "student";
  if (pathname.startsWith("/educator")) return "educator";
  if (pathname.startsWith("/external")) return "external_member";
  return null;
}
