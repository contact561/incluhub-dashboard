import type {
  EducatorType,
  ExternalMemberType,
  PaymentStatus,
  StudentCategory,
  UserRole,
} from "@/types/database";

export const USER_ROLES: UserRole[] = [
  "admin",
  "student",
  "educator",
  "external_member",
];

export const PROFILE_STATUSES = [
  "active",
  "inactive",
  "suspended",
  "pending_onboarding",
] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

/** Statuses Admin may set when creating/editing users. */
export const ADMIN_ASSIGNABLE_PROFILE_STATUSES = [
  "active",
  "inactive",
  "suspended",
] as const;

/** Categories Admin may assign when creating accounts (includes fashion designer). */
export const STUDENT_CATEGORIES: StudentCategory[] = [
  "makeup_artist",
  "photographer",
  "hairstylist",
  "fashion_designer",
];

/** Categories allowed in a 3-person studio team. */
export const TEAM_STUDENT_CATEGORIES: StudentCategory[] = [
  "makeup_artist",
  "photographer",
  "hairstylist",
];

export const EDUCATOR_TYPES: EducatorType[] = [
  "makeup_educator",
  "photography_educator",
  "hairstyling_educator",
];

export const EXTERNAL_MEMBER_TYPES: ExternalMemberType[] = [
  "model",
  "creative_director",
  "photographer",
  "brand_mentor",
  "shoot_mentor",
  "other",
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "confirmed",
  "waived",
  "not_required",
];

export type CreateUserInput = {
  full_name: string;
  email: string;
  phone: string | null;
  password: string;
  role: UserRole;
  status: ProfileStatus;
  student_category?: StudentCategory;
  educator_type?: EducatorType;
  external_member_type?: ExternalMemberType;
  institute_id?: string;
  payment_status?: PaymentStatus;
};

export type CreateUserValidationResult =
  | { success: true; data: CreateUserInput }
  | { success: false; error: string };

function isOneOf<T extends string>(value: string, options: readonly T[]): value is T {
  return (options as readonly string[]).includes(value);
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export function parseCreateUserFormData(
  formData: FormData
): CreateUserValidationResult {
  const full_name = readString(formData, "full_name");
  const email = readString(formData, "email").toLowerCase();
  const phoneRaw = readString(formData, "phone");
  const password = String(formData.get("password") ?? "");
  const roleRaw = readString(formData, "role");
  const statusRaw = readString(formData, "status");

  if (!full_name) {
    return { success: false, error: "Full name is required." };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "A valid email address is required." };
  }

  if (!password || password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }

  if (!isOneOf(roleRaw, USER_ROLES)) {
    return { success: false, error: "Please select a valid role." };
  }

  if (!isOneOf(statusRaw, ADMIN_ASSIGNABLE_PROFILE_STATUSES)) {
    return { success: false, error: "Please select a valid status." };
  }

  const base: CreateUserInput = {
    full_name,
    email,
    phone: phoneRaw || null,
    password,
    role: roleRaw,
    status: statusRaw,
  };

  switch (roleRaw) {
    case "admin":
      return { success: true, data: base };

    case "student": {
      const student_category = readString(formData, "student_category");
      const institute_id = readString(formData, "institute_id");
      const payment_status = readString(formData, "payment_status");

      if (!isOneOf(student_category, STUDENT_CATEGORIES)) {
        return {
          success: false,
          error: "Student category is required for student accounts.",
        };
      }

      if (!institute_id) {
        return {
          success: false,
          error: "Institute is required for student accounts.",
        };
      }

      if (!isOneOf(payment_status, PAYMENT_STATUSES)) {
        return {
          success: false,
          error: "Payment status is required for student accounts.",
        };
      }

      return {
        success: true,
        data: {
          ...base,
          student_category,
          institute_id,
          payment_status,
        },
      };
    }

    case "educator": {
      const educator_type = readString(formData, "educator_type");
      const institute_id = readString(formData, "institute_id");

      if (!isOneOf(educator_type, EDUCATOR_TYPES)) {
        return {
          success: false,
          error: "Educator type is required for educator accounts.",
        };
      }

      if (!institute_id) {
        return {
          success: false,
          error: "Institute is required for educator accounts.",
        };
      }

      return {
        success: true,
        data: {
          ...base,
          educator_type,
          institute_id,
        },
      };
    }

    case "external_member": {
      const external_member_type = readString(formData, "external_member_type");

      if (!isOneOf(external_member_type, EXTERNAL_MEMBER_TYPES)) {
        return {
          success: false,
          error: "External member type is required for external member accounts.",
        };
      }

      return {
        success: true,
        data: {
          ...base,
          external_member_type,
        },
      };
    }

    default: {
      const _exhaustive: never = roleRaw;
      return {
        success: false,
        error: `Unsupported role: ${_exhaustive}`,
      };
    }
  }
}
