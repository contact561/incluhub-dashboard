import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { isStudioSlotCode, type StudioSlotCode } from "@/lib/constants/studioSlots";
import type {
  PortfolioParticipantView,
  StudentPortfolioCard,
  StudentPortfolioResult,
} from "@/types/studio-booking";
import type {
  PortfolioWorkflowStatus,
  StudentCategory,
} from "@/types/database";

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

function waitingMessageForPortfolio(portfolioType: StudentCategory): string {
  return `Waiting for the ${STUDENT_CATEGORY_LABELS[portfolioType]} leader to book the studio.`;
}

export function getAssistantWaitingMessage(
  portfolioType: StudentCategory
): string {
  return waitingMessageForPortfolio(portfolioType);
}

export async function getStudentPortfolioPageData(): Promise<StudentPortfolioResult> {
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
    console.error("[getStudentPortfolioPageData] student", studentError.message);
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
          leader_student_id
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
          studio_slot_occupancy!occupancy_id (
            booking_date,
            slot_code
          )
        `
        )
        .eq("team_id", teamId),
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
      /studio_bookings|studio_slot_occupancy|get_studio_slot_availability/i.test(
        firstError
      );

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
    current_stage_number: number;
    programs: { name: string } | null;
  };

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

  const { data: participantsData, error: participantsError } = await supabase
    .from("portfolio_participants")
    .select("portfolio_output_id, student_id, participation_role")
    .in(
      "portfolio_output_id",
      ((portfoliosResult.data ?? []) as Array<{ id: string }>).map((row) => row.id)
    );

  if (participantsError) {
    return { data: null, error: participantsError.message };
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

  const bookingByPortfolio = new Map(
    (
      (bookingsResult.data ?? []) as Array<{
        portfolio_output_id: string;
        booked_at: string;
        studio_slot_occupancy: {
          booking_date: string;
          slot_code: string;
        } | null;
      }>
    )
      .filter(
        (row) =>
          row.studio_slot_occupancy &&
          isStudioSlotCode(row.studio_slot_occupancy.slot_code)
      )
      .map((row) => [
        row.portfolio_output_id,
        {
          portfolioOutputId: row.portfolio_output_id,
          bookingDate: row.studio_slot_occupancy!.booking_date,
          slotCode: row.studio_slot_occupancy!.slot_code as StudioSlotCode,
          bookedAt: row.booked_at,
        },
      ])
  );

  const portfolios: StudentPortfolioCard[] = (
    (portfoliosResult.data ?? []) as Array<{
      id: string;
      sequence_order: number | null;
      portfolio_type: StudentCategory;
      workflow_status: PortfolioWorkflowStatus | null;
      leader_student_id: string;
    }>
  )
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
        booking: bookingByPortfolio.get(row.id) ?? null,
        lockedReason: lockedReasonForPortfolio(
          row.workflow_status as PortfolioWorkflowStatus,
          row.sequence_order as number
        ),
      };
    });

  return {
    data: {
      teamId: team.id,
      teamName: team.team_name,
      programName: team.programs?.name ?? null,
      currentStageNumber: team.current_stage_number,
      currentStudentId,
      currentStudentName,
      portfolios,
    },
    error: null,
  };
}
