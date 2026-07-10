import type {
  EducatorType,
  ExternalMemberType,
  PaymentStatus,
  StudentCategory,
  UserRole,
} from "@/types/database";

export function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  student: "Student",
  educator: "Educator",
  external_member: "External Member",
};

export const STUDENT_CATEGORY_LABELS: Record<StudentCategory, string> = {
  makeup_artist: "Makeup Artist",
  photographer: "Photographer",
  hairstylist: "Hairstylist",
};

export const EDUCATOR_TYPE_LABELS: Record<EducatorType, string> = {
  makeup_educator: "Makeup Educator",
  photography_educator: "Photography Educator",
  hairstyling_educator: "Hairstyling Educator",
};

export const EXTERNAL_MEMBER_TYPE_LABELS: Record<ExternalMemberType, string> = {
  model: "Model",
  creative_director: "Creative Director",
  photographer: "Photographer",
  brand_mentor: "Brand Mentor",
  shoot_mentor: "Shoot Mentor",
  other: "Other",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  waived: "Waived",
  not_required: "Not Required",
};
