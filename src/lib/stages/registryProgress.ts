import type { StageDefinition, StageStatus } from "@/types/database";

/** Map experiment registry codes → legacy numeric stages (RPCs unchanged). */
export const STAGE_CODE_TO_LEGACY_NUMBER: Record<string, number> = {
  team_building: 1,
  bms_inauguration: 2,
  mood_board: 3,
  portfolio_studio: 3,
};

export type RegistryStageProgressStatus =
  | "locked"
  | "not_started"
  | "in_progress"
  | "completed";

export type RegistryStageView = StageDefinition & {
  progressStatus: RegistryStageProgressStatus;
  legacyStageNumber: number | null;
};

export function mapLegacyStatusToRegistry(
  status: StageStatus | null | undefined,
  legacyNumber: number,
  currentStageNumber: number | null
): RegistryStageProgressStatus {
  if (status === "completed") return "completed";
  if (status === "in_progress" || status === "pending_approval") {
    return "in_progress";
  }
  if (status === "locked") return "locked";
  if (status === "not_started") return "not_started";

  if (currentStageNumber == null) {
    return legacyNumber === 1 ? "not_started" : "locked";
  }
  if (legacyNumber < currentStageNumber) return "completed";
  if (legacyNumber === currentStageNumber) return "in_progress";
  return "locked";
}

export function moodBoardStatusToRegistry(
  moodStatus: string | null | undefined,
  bmsCompleted: boolean
): RegistryStageProgressStatus {
  if (!bmsCompleted) return "locked";
  if (moodStatus === "approved") return "completed";
  if (
    moodStatus === "pending_review" ||
    moodStatus === "revision_required"
  ) {
    return "in_progress";
  }
  return "not_started";
}

export function portfolioStudioStatusToRegistry(options: {
  moodApproved: boolean;
  stage3Status: StageStatus | null | undefined;
  currentStageNumber: number | null;
}): RegistryStageProgressStatus {
  if (!options.moodApproved) return "locked";
  return mapLegacyStatusToRegistry(
    options.stage3Status,
    3,
    options.currentStageNumber
  );
}

export function buildRegistryStageViews(
  definitions: StageDefinition[],
  options: {
    currentStageNumber: number | null;
    /** status by legacy stage_number from team_stage_progress */
    progressByStageNumber?: Record<number, StageStatus>;
    /** overrides keyed by stage_definitions.code (mood_board / portfolio_studio) */
    progressByCode?: Partial<Record<string, RegistryStageProgressStatus>>;
  }
): RegistryStageView[] {
  const {
    currentStageNumber,
    progressByStageNumber = {},
    progressByCode = {},
  } = options;

  return definitions.map((definition) => {
    const legacyStageNumber =
      STAGE_CODE_TO_LEGACY_NUMBER[definition.code] ?? null;

    const override = progressByCode[definition.code];
    const progressStatus =
      override ??
      (legacyStageNumber == null
        ? ("locked" as const)
        : mapLegacyStatusToRegistry(
            progressByStageNumber[legacyStageNumber],
            legacyStageNumber,
            currentStageNumber
          ));

    return {
      ...definition,
      legacyStageNumber,
      progressStatus,
    };
  });
}
