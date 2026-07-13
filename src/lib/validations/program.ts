export const PROGRAM_STATUSES = ["active", "completed", "paused"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export type CreateProgramInput = {
  institute_ids: string[];
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProgramStatus;
};

export type CreateProgramValidationResult =
  | { success: true; data: CreateProgramInput }
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

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime());
}

export function parseCreateProgramFormData(
  formData: FormData
): CreateProgramValidationResult {
  const institute_ids = formData
    .getAll("institute_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const name = readString(formData, "name");
  const description = readString(formData, "description");
  const start_date = readString(formData, "start_date");
  const end_date = readString(formData, "end_date");
  const statusRaw = readString(formData, "status");

  if (institute_ids.length < 1) {
    return {
      success: false,
      error: "Select at least one participating institute.",
    };
  }

  if (new Set(institute_ids).size !== institute_ids.length) {
    return { success: false, error: "Duplicate institutes are not allowed." };
  }

  if (!name) {
    return { success: false, error: "Program name is required." };
  }

  if (start_date && !isValidDate(start_date)) {
    return { success: false, error: "Start date must be a valid date." };
  }

  if (end_date && !isValidDate(end_date)) {
    return { success: false, error: "End date must be a valid date." };
  }

  if (start_date && end_date && end_date < start_date) {
    return {
      success: false,
      error: "End date cannot be earlier than start date.",
    };
  }

  if (!isOneOf(statusRaw, PROGRAM_STATUSES)) {
    return { success: false, error: "Please select a valid status." };
  }

  return {
    success: true,
    data: {
      institute_ids,
      name,
      description: description || null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: statusRaw,
    },
  };
}

export type EnrollStudentsInput = {
  program_id: string;
  student_ids: string[];
};

export type EnrollStudentsValidationResult =
  | { success: true; data: EnrollStudentsInput }
  | { success: false; error: string };

export function parseEnrollStudentsFormData(
  formData: FormData
): EnrollStudentsValidationResult {
  const program_id = readString(formData, "program_id");
  const student_ids = formData
    .getAll("student_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!program_id) {
    return { success: false, error: "Program is required." };
  }

  if (student_ids.length < 1) {
    return { success: false, error: "Select at least one student to enroll." };
  }

  if (new Set(student_ids).size !== student_ids.length) {
    return { success: false, error: "Duplicate students are not allowed." };
  }

  return {
    success: true,
    data: { program_id, student_ids },
  };
}
