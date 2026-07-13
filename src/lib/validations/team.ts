export type CreateTeamInput = {
  team_name: string;
  program_id: string;
  makeup_artist_student_id: string;
  photographer_student_id: string;
  hairstylist_student_id: string;
  makeup_educator_id: string;
  photography_educator_id: string;
  hairstyling_educator_id: string;
};

export type CreateTeamValidationResult =
  | { success: true; data: CreateTeamInput }
  | { success: false; error: string };

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export function parseCreateTeamFormData(
  formData: FormData
): CreateTeamValidationResult {
  const team_name = readString(formData, "team_name");
  const program_id = readString(formData, "program_id");
  const makeup_artist_student_id = readString(
    formData,
    "makeup_artist_student_id"
  );
  const photographer_student_id = readString(
    formData,
    "photographer_student_id"
  );
  const hairstylist_student_id = readString(
    formData,
    "hairstylist_student_id"
  );
  const makeup_educator_id = readString(formData, "makeup_educator_id");
  const photography_educator_id = readString(
    formData,
    "photography_educator_id"
  );
  const hairstyling_educator_id = readString(
    formData,
    "hairstyling_educator_id"
  );

  if (!team_name) {
    return { success: false, error: "Team name is required." };
  }

  if (!program_id) {
    return { success: false, error: "Program / Batch is required." };
  }

  if (
    !makeup_artist_student_id ||
    !photographer_student_id ||
    !hairstylist_student_id
  ) {
    return {
      success: false,
      error: "All three student roles are required.",
    };
  }

  if (
    !makeup_educator_id ||
    !photography_educator_id ||
    !hairstyling_educator_id
  ) {
    return {
      success: false,
      error: "All three educator roles are required.",
    };
  }

  const studentIds = [
    makeup_artist_student_id,
    photographer_student_id,
    hairstylist_student_id,
  ];

  if (new Set(studentIds).size !== 3) {
    return {
      success: false,
      error: "All three students must be different people.",
    };
  }

  const educatorIds = [
    makeup_educator_id,
    photography_educator_id,
    hairstyling_educator_id,
  ];

  if (new Set(educatorIds).size !== 3) {
    return {
      success: false,
      error: "All three educators must be different people.",
    };
  }

  return {
    success: true,
    data: {
      team_name,
      program_id,
      makeup_artist_student_id,
      photographer_student_id,
      hairstylist_student_id,
      makeup_educator_id,
      photography_educator_id,
      hairstyling_educator_id,
    },
  };
}
