import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { findActiveTeamPortfolio } from "@/lib/portfolio/workflow-status";
import { isStudioSlotCode, type StudioSlotCode } from "@/lib/constants/studioSlots";
import type { StudentStage3PortfolioContext } from "@/types/student-portal";
import type {
  PortfolioParticipantView,
  StudentPortfolioCard,
  StudentPortfolioResult,
} from "@/types/studio-booking";
import type {
  PortfolioRevisionFeedback,
  PortfolioReviewView,
  PortfolioSubmissionVersionView,
  PortfolioSubmissionView,
} from "@/types/portfolio-submission";
import type {
  PortfolioReviewDecision,
  PortfolioReviewerStage,
  PortfolioRevisionRoute,
  PortfolioWorkflowStatus,
  StudentCategory,
} from "@/types/database";

const LOADER = "getStudentStage3PortfolioContext";

function lockedReasonForPortfolio(
  workflowStatus: PortfolioWorkflowStatus,
  sequenceOrder: number
): string | null {
  if (workflowStatus !== "locked") {
    return null;
  }

  const labels: Record<number, string> = {
    2: "Unlocks after the Photography portfolio is completed.",
    3: "Unlocks after the Makeup portfolio is completed.",
  };

  return (
    labels[sequenceOrder] ??
    "This portfolio is locked until the previous portfolio in the sequence is completed."
  );
}

export function getAssistantWaitingMessage(
  portfolioType: StudentCategory
): string {
  return `Waiting for the ${STUDENT_CATEGORY_LABELS[portfolioType]} leader to book the studio.`;
}

export function getAssistantSubmissionWaitingMessage(
  portfolioType: StudentCategory
): string {
  return `Waiting for the ${STUDENT_CATEGORY_LABELS[portfolioType]} leader to submit the portfolio.`;
}

export function getAssistantRevisionWaitingMessage(
  portfolioType: StudentCategory
): string {
  return `Revision was requested. Waiting for the ${STUDENT_CATEGORY_LABELS[portfolioType]} leader to resubmit the portfolio.`;
}

export async function getStudentStage3PortfolioContext(): Promise<{
  data: StudentStage3PortfolioContext | null;
  error: string | null;
}> {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student" || profile.status !== "active") {
    return {
      data: null,
      error: "You do not have permission to perform this action.",
    };
  }

  const supabase = await createClient();

  const { data: studentRow, error: studentError } = await supabase
    .from("students")
    .select(
      `
      id,
      current_team_id,
      profiles!user_id (
        full_name
      )
    `
    )
    .eq("user_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (studentError) {
    console.error(`[${LOADER}] student`, studentError.message);
    return { data: null, error: studentError.message };
  }

  if (!studentRow?.current_team_id) {
    return {
      data: null,
      error: "You are not part of this team.",
    };
  }

  const teamId = studentRow.current_team_id as string;
  const currentStudentId = studentRow.id as string;
  const currentStudentName =
    (studentRow.profiles as { full_name: string } | null)?.full_name ?? "—";

  const [teamResult, portfoliosResult, bookingsResult, membersResult] =
    await Promise.all([
      supabase
        .from("teams")
        .select(
          `
          id,
          team_name,
          current_stage_number,
          programs!program_id (
            name
          )
        `
        )
        .eq("id", teamId)
        .maybeSingle(),
      supabase
        .from("portfolio_outputs")
        .select(
          `
          id,
          sequence_order,
          portfolio_type,
          workflow_status,
          leader_student_id,
          revision_return_to
        `
        )
        .eq("team_id", teamId)
        .order("sequence_order", { ascending: true }),
      supabase
        .from("studio_bookings")
        .select(
          `
          id,
          portfolio_output_id,
          booked_at,
          verification_status,
          physically_verified_at,
          studio_slot_occupancy!occupancy_id (
            booking_date,
            slot_code
          )
        `
        )
        .eq("team_id", teamId)
        .order("booked_at", { ascending: false }),
      supabase
        .from("team_members")
        .select(
          `
          student_id,
          student_category,
          member_status,
          students!student_id (
            id,
            student_category,
            profiles!user_id (
              full_name
            )
          )
        `
        )
        .eq("team_id", teamId)
        .eq("member_status", "active"),
    ]);

  const firstError =
    teamResult.error?.message ||
    portfoliosResult.error?.message ||
    bookingsResult.error?.message ||
    membersResult.error?.message ||
    null;

  if (firstError) {
    const migrationHint =
      /studio_bookings|studio_slot_occupancy|get_studio_slot_availability|portfolio_submissions|submit_portfolio/i.test(
        firstError
      );

    console.error(`[${LOADER}]`, firstError);
    return {
      data: null,
      error: migrationHint
        ? "The database migration has not been applied."
        : firstError,
    };
  }

  if (!teamResult.data) {
    return { data: null, error: "You are not part of this team." };
  }

  const team = teamResult.data as {
    id: string;
    team_name: string;
    current_stage_number: number | null;
    programs: { name: string } | null;
  };

  const portfolioRows = (portfoliosResult.data ?? []) as Array<{
    id: string;
    sequence_order: number | null;
    portfolio_type: StudentCategory;
    workflow_status: PortfolioWorkflowStatus | null;
    leader_student_id: string;
    revision_return_to: PortfolioRevisionRoute | null;
  }>;

  const portfolioIds = portfolioRows.map((row) => row.id);

  const { data: submissionsData, error: submissionsError } =
    portfolioIds.length > 0
      ? await supabase
          .from("portfolio_submissions")
          .select(
            `
          id,
          portfolio_output_id,
          version_number,
          title,
          portfolio_url,
          notes,
          created_at,
          submitted_by_student_id,
          students!submitted_by_student_id (
            profiles!user_id (
              full_name
            )
          )
        `
          )
          .in("portfolio_output_id", portfolioIds)
          .order("version_number", { ascending: true })
      : { data: [], error: null };

  if (submissionsError) {
    console.error(`[${LOADER}] submissions`, submissionsError.message);
    return { data: null, error: submissionsError.message };
  }

  const memberNameById = new Map<string, { name: string; category: StudentCategory }>(
    (
      (membersResult.data ?? []) as Array<{
        student_id: string;
        student_category: StudentCategory;
        students: {
          id: string;
          student_category: StudentCategory;
          profiles: { full_name: string } | null;
        } | null;
      }>
    ).map((member) => [
      member.student_id,
      {
        name: member.students?.profiles?.full_name ?? "—",
        category: member.student_category,
      },
    ])
  );

  const { data: participantsData, error: participantsError } =
    portfolioIds.length > 0
      ? await supabase
          .from("portfolio_participants")
          .select("portfolio_output_id, student_id, participation_role")
          .in("portfolio_output_id", portfolioIds)
      : { data: [], error: null };

  if (participantsError) {
    console.error(`[${LOADER}] participants`, participantsError.message);
    return { data: null, error: participantsError.message };
  }

  const { data: availabilityData, error: availabilityError } =
    portfolioIds.length > 0
      ? await supabase
          .from("studio_availability_responses")
          .select("portfolio_output_id, assistant_student_id, booking_date, slot_code")
          .in("portfolio_output_id", portfolioIds)
          .order("booking_date", { ascending: true })
      : { data: [], error: null };

  if (availabilityError) {
    console.error(`[${LOADER}] availability`, availabilityError.message);
    return {
      data: null,
      error: /studio_availability_responses/i.test(availabilityError.message)
        ? "The database migration has not been applied."
        : availabilityError.message,
    };
  }

  const participantsByPortfolio = new Map<string, PortfolioParticipantView[]>();
  for (const row of (participantsData ?? []) as Array<{
    portfolio_output_id: string;
    student_id: string;
    participation_role: "leader" | "assistant";
  }>) {
    const member = memberNameById.get(row.student_id);
    const current = participantsByPortfolio.get(row.portfolio_output_id) ?? [];
    current.push({
      studentId: row.student_id,
      fullName: member?.name ?? "—",
      category: member?.category ?? "makeup_artist",
      role: row.participation_role,
    });
    participantsByPortfolio.set(row.portfolio_output_id, current);
  }

  const bookingByPortfolio = new Map<string, StudentPortfolioCard["booking"]>();
  const bookingRows = (bookingsResult.data ?? []) as Array<{
        id: string;
        portfolio_output_id: string;
        booked_at: string;
        verification_status: "online_confirmed" | "physically_verified" | "no_show";
        physically_verified_at: string | null;
        studio_slot_occupancy: {
          booking_date: string;
          slot_code: string;
        } | null;
      }>;
  for (const row of bookingRows) {
    if (
      row.verification_status === "no_show" ||
      !row.studio_slot_occupancy ||
      !isStudioSlotCode(row.studio_slot_occupancy.slot_code) ||
      bookingByPortfolio.has(row.portfolio_output_id)
    ) continue;
    bookingByPortfolio.set(row.portfolio_output_id, {
          id: row.id,
          portfolioOutputId: row.portfolio_output_id,
          bookingDate: row.studio_slot_occupancy!.booking_date,
          slotCode: row.studio_slot_occupancy!.slot_code as StudioSlotCode,
          bookedAt: row.booked_at,
          verificationStatus: row.verification_status,
          physicallyVerifiedAt: row.physically_verified_at,
        });
  }

  const availabilityByPortfolio = new Map<string, StudentPortfolioCard["assistantAvailability"]>();
  for (const row of (availabilityData ?? []) as Array<{
    portfolio_output_id: string;
    assistant_student_id: string;
    booking_date: string;
    slot_code: string;
  }>) {
    if (!isStudioSlotCode(row.slot_code)) continue;
    const choices = availabilityByPortfolio.get(row.portfolio_output_id) ?? [];
    choices.push({
      assistantStudentId: row.assistant_student_id,
      assistantName: memberNameById.get(row.assistant_student_id)?.name ?? "Assistant",
      bookingDate: row.booking_date,
      slotCode: row.slot_code,
    });
    availabilityByPortfolio.set(row.portfolio_output_id, choices);
  }

  const submissionRows = (submissionsData ?? []) as Array<{
    id: string;
    portfolio_output_id: string;
    version_number: number;
    title: string;
    portfolio_url: string;
    notes: string | null;
    created_at: string;
    submitted_by_student_id: string;
    students: {
      profiles: { full_name: string } | null;
    } | null;
  }>;

  const toSubmissionView = (
    row: (typeof submissionRows)[number]
  ): PortfolioSubmissionView => ({
    id: row.id,
    versionNumber: row.version_number,
    title: row.title,
    portfolioUrl: row.portfolio_url,
    notes: row.notes,
    submittedAt: row.created_at,
    submittedByStudentId: row.submitted_by_student_id,
    submittedByName:
      row.students?.profiles?.full_name ??
      memberNameById.get(row.submitted_by_student_id)?.name ??
      "—",
  });

  const submissionByPortfolio = new Map<string, PortfolioSubmissionView>();
  for (const row of submissionRows) {
    const existing = submissionByPortfolio.get(row.portfolio_output_id);
    if (existing && existing.versionNumber > row.version_number) {
      continue;
    }

    submissionByPortfolio.set(row.portfolio_output_id, toSubmissionView(row));
  }

  const teamPortfolioProgress: StudentPortfolioCard[] = portfolioRows
    .filter(
      (row) => row.sequence_order !== null && row.workflow_status !== null
    )
    .map((row) => {
      const leader = memberNameById.get(row.leader_student_id);
      return {
        id: row.id,
        sequenceOrder: row.sequence_order as number,
        portfolioType: row.portfolio_type,
        workflowStatus: row.workflow_status as PortfolioWorkflowStatus,
        leaderStudentId: row.leader_student_id,
        leaderName: leader?.name ?? "—",
        participants: participantsByPortfolio.get(row.id) ?? [],
        assistantAvailability: availabilityByPortfolio.get(row.id) ?? [],
        booking: bookingByPortfolio.get(row.id) ?? null,
        submission: submissionByPortfolio.get(row.id) ?? null,
        lockedReason: lockedReasonForPortfolio(
          row.workflow_status as PortfolioWorkflowStatus,
          row.sequence_order as number
        ),
        revisionReturnTo: row.revision_return_to,
      };
    });

  const ownPortfolioOutput =
    teamPortfolioProgress.find(
      (portfolio) => portfolio.leaderStudentId === currentStudentId
    ) ?? null;

  const activeTeamPortfolio = findActiveTeamPortfolio(teamPortfolioProgress);

  // ---------------------------------------------------------------------
  // Package D4: own-portfolio submission history and revision feedback.
  // Scoped strictly to the portfolio led by the logged-in student.
  // ---------------------------------------------------------------------
  let ownPortfolioSubmissionHistory: PortfolioSubmissionVersionView[] = [];
  let ownPortfolioRevisionFeedback: PortfolioRevisionFeedback | null = null;

  if (ownPortfolioOutput) {
    const ownSubmissionRows = submissionRows.filter(
      (row) => row.portfolio_output_id === ownPortfolioOutput.id
    );
    const ownSubmissionIds = ownSubmissionRows.map((row) => row.id);

    type ReviewRow = {
      portfolio_submission_id: string;
      reviewer_stage: PortfolioReviewerStage;
      reviewer_user_id: string;
      decision: PortfolioReviewDecision;
      comments: string | null;
      created_at: string;
    };

    let reviewRows: ReviewRow[] = [];

    if (ownSubmissionIds.length > 0) {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("portfolio_reviews")
        .select(
          "portfolio_submission_id, reviewer_stage, reviewer_user_id, decision, comments, created_at"
        )
        .in("portfolio_submission_id", ownSubmissionIds)
        .order("created_at", { ascending: true });

      if (reviewsError) {
        console.error(`[${LOADER}] reviews`, reviewsError.message);
        return { data: null, error: reviewsError.message };
      }

      reviewRows = (reviewsData ?? []) as ReviewRow[];
    }

    const reviewerIds = Array.from(
      new Set(reviewRows.map((row) => row.reviewer_user_id))
    );

    const reviewerNameById = new Map<string, string>();
    if (reviewerIds.length > 0) {
      const { data: reviewerProfiles, error: reviewerError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", reviewerIds);

      if (reviewerError) {
        console.error(`[${LOADER}] reviewer profiles`, reviewerError.message);
        return { data: null, error: reviewerError.message };
      }

      for (const reviewer of (reviewerProfiles ?? []) as Array<{
        id: string;
        full_name: string;
      }>) {
        reviewerNameById.set(reviewer.id, reviewer.full_name);
      }
    }

    const toReviewView = (row: ReviewRow): PortfolioReviewView => ({
      reviewerStage: row.reviewer_stage,
      decision: row.decision,
      comments: row.comments,
      reviewerName: reviewerNameById.get(row.reviewer_user_id) ?? null,
      reviewedAt: row.created_at,
    });

    // Latest review per submission per stage (reviews are ordered ascending).
    const latestReviewBySubmissionStage = new Map<string, ReviewRow>();
    for (const row of reviewRows) {
      latestReviewBySubmissionStage.set(
        `${row.portfolio_submission_id}:${row.reviewer_stage}`,
        row
      );
    }

    ownPortfolioSubmissionHistory = ownSubmissionRows
      .slice()
      .sort((a, b) => b.version_number - a.version_number)
      .map((row) => {
        const educatorRow = latestReviewBySubmissionStage.get(
          `${row.id}:educator`
        );
        const adminRow = latestReviewBySubmissionStage.get(`${row.id}:admin`);
        return {
          ...toSubmissionView(row),
          educatorReview: educatorRow ? toReviewView(educatorRow) : null,
          adminReview: adminRow ? toReviewView(adminRow) : null,
        };
      });

    if (
      ownPortfolioOutput.workflowStatus === "revision_required" &&
      ownPortfolioOutput.revisionReturnTo
    ) {
      const returnTo = ownPortfolioOutput.revisionReturnTo;
      for (const version of ownPortfolioSubmissionHistory) {
        const review =
          returnTo === "educator"
            ? version.educatorReview
            : version.adminReview;
        if (review && review.decision === "revision_required") {
          ownPortfolioRevisionFeedback = {
            reviewerStage: returnTo,
            reviewerName: review.reviewerName,
            comments: review.comments,
            reviewedAt: review.reviewedAt,
            versionNumber: version.versionNumber,
          };
          break;
        }
      }
    }
  }

  return {
    data: {
      teamId: team.id,
      teamName: team.team_name,
      programName: team.programs?.name ?? null,
      currentStageNumber: team.current_stage_number,
      currentStudentId,
      currentStudentName,
      ownPortfolioOutput,
      teamPortfolioProgress,
      activeTeamPortfolio,
      ownPortfolioSubmissionHistory,
      ownPortfolioRevisionFeedback,
    },
    error: null,
  };
}

export async function getStudentPortfolioPageData(): Promise<StudentPortfolioResult> {
  const { data, error } = await getStudentStage3PortfolioContext();
  if (error || !data) {
    return { data: null, error };
  }

  return {
    data: {
      teamId: data.teamId,
      teamName: data.teamName,
      programName: data.programName,
      currentStageNumber: data.currentStageNumber,
      currentStudentId: data.currentStudentId,
      currentStudentName: data.currentStudentName,
      ownPortfolioOutput: data.ownPortfolioOutput,
      teamPortfolioProgress: data.teamPortfolioProgress,
      activeTeamPortfolio: data.activeTeamPortfolio,
      portfolios: data.teamPortfolioProgress,
      ownPortfolioSubmissionHistory: data.ownPortfolioSubmissionHistory,
      ownPortfolioRevisionFeedback: data.ownPortfolioRevisionFeedback,
    },
    error: null,
  };
}
