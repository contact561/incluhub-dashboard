import type { UserRole } from "@/types/database";

export type NavItem = {
  label: string;
  href: string;
  /** Visual-only badge (e.g. "Coming later"). Does not change permissions. */
  badge?: string;
  /** When true, Sidebar hides the link. Routes/permissions remain unchanged. */
  hidden?: boolean;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "IncluHub Admin",
  student: "Student Portal",
  educator: "Educator Portal",
  external_member: "External Portal",
};

export function canAccessRoleRoute(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return userRole === requiredRole;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Users", href: "/admin/users" },
  { label: "Institutes", href: "/admin/institutes" },
  { label: "Programs", href: "/admin/programs" },
  { label: "Students", href: "/admin/students" },
  { label: "Educators", href: "/admin/educators" },
  {
    label: "External Members",
    href: "/admin/external-members",
    hidden: true,
  },
  { label: "Teams", href: "/admin/teams" },
  { label: "Stages", href: "/admin/stages" },
  { label: "Studio Schedule", href: "/admin/studio-schedule" },
  { label: "Portfolio Approvals", href: "/admin/portfolio-approvals" },
  {
    label: "Project Approvals",
    href: "/admin/project-approvals",
    hidden: true,
  },
  {
    label: "Notifications",
    href: "/admin/notifications",
  },
  {
    label: "Activity Logs",
    href: "/admin/activity-logs",
    hidden: true,
  },
];

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "My Team", href: "/student/my-team" },
  { label: "My Stage", href: "/student/my-stage" },
  { label: "Portfolio", href: "/student/portfolio" },
  { label: "Brand Opportunity", href: "/student/brand-opportunity" },
  { label: "Notifications", href: "/student/notifications" },
];

export const STUDENT_ECOSYSTEM_NAV_ITEM: NavItem = {
  label: "Ecosystem",
  href: "/student/ecosystem",
};

export const EDUCATOR_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/educator/dashboard" },
  { label: "My Teams", href: "/educator/my-teams" },
  { label: "My Students", href: "/educator/my-students" },
  { label: "Portfolio Reviews", href: "/educator/portfolio-reviews" },
  { label: "Notifications", href: "/educator/notifications" },
];

export const EXTERNAL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/external/dashboard", hidden: true },
  {
    label: "Assigned Team",
    href: "/external/assigned-team",
    hidden: true,
  },
  {
    label: "Project Details",
    href: "/external/project-details",
    hidden: true,
  },
  {
    label: "Notifications",
    href: "/external/notifications",
    hidden: true,
  },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "admin":
      return ADMIN_NAV_ITEMS;
    case "student":
      return STUDENT_NAV_ITEMS;
    case "educator":
      return EDUCATOR_NAV_ITEMS;
    case "external_member":
      return EXTERNAL_NAV_ITEMS;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
