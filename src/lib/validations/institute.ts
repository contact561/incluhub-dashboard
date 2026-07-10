export const INSTITUTE_STATUSES = ["active", "inactive"] as const;
export type InstituteStatus = (typeof INSTITUTE_STATUSES)[number];

export type CreateInstituteInput = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website_or_social: string | null;
  authorized_person_name: string | null;
  status: InstituteStatus;
};

export type CreateInstituteValidationResult =
  | { success: true; data: CreateInstituteInput }
  | { success: false; error: string };

function isOneOf<T extends string>(
  value: string,
  options: readonly T[]
): value is T {
  return (options as readonly string[]).includes(value);
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export function parseCreateInstituteFormData(
  formData: FormData
): CreateInstituteValidationResult {
  const name = readString(formData, "name");
  const address = readString(formData, "address");
  const phone = readString(formData, "phone");
  const email = readString(formData, "email");
  const website_or_social = readString(formData, "website_or_social");
  const authorized_person_name = readString(formData, "authorized_person_name");
  const statusRaw = readString(formData, "status");

  if (!name) {
    return { success: false, error: "Institute name is required." };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Enter a valid email address." };
  }

  if (!isOneOf(statusRaw, INSTITUTE_STATUSES)) {
    return { success: false, error: "Please select a valid status." };
  }

  return {
    success: true,
    data: {
      name,
      address: address || null,
      phone: phone || null,
      email: email || null,
      website_or_social: website_or_social || null,
      authorized_person_name: authorized_person_name || null,
      status: statusRaw,
    },
  };
}
