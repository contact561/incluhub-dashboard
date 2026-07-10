export { getCurrentUser } from "@/lib/auth/getCurrentUser";
export { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
export {
  getDashboardPathForRole,
  getRoleForRoutePrefix,
} from "@/lib/auth/getDashboardPathForRole";
export { redirectToDashboardByRole } from "@/lib/auth/redirectToDashboardByRole";
export { requireRole } from "@/lib/auth/requireRole";
export { canAccessRoleRoute, getNavItemsForRole } from "@/lib/permissions/roles";
