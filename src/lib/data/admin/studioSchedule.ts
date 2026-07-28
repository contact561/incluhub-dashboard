import { createClient } from "@/lib/supabase/server";
import {
  isStudioSlotCode,
  type StudioSlotCode,
} from "@/lib/constants/studioSlots";
import type { AdminStudioScheduleResult } from "@/types/studio-booking";
import type { StudentCategory } from "@/types/database";

type ScheduleBase = {
  id: string;
  booked_at: string;
  verification_status: "online_confirmed" | "physically_verified" | "no_show";
  physically_verified_at: string | null;
  no_show_remarks: string | null;
  teams: {
    team_name: string;
    programs: { name: string } | null;
  } | null;
  studio_slot_occupancy: {
    booking_date: string;
    slot_code: string;
  } | null;
};

export async function getAdminStudioSchedule(
  bookingDate?: string | null
): Promise<AdminStudioScheduleResult> {
  const supabase = await createClient();
  const [portfolioResult, personalResult] = await Promise.all([
    supabase.from("studio_bookings").select(`
      id, booked_at, verification_status, physically_verified_at, no_show_remarks,
      portfolio_outputs!portfolio_output_id (
        portfolio_type,
        students!leader_student_id ( profiles!user_id ( full_name ) )
      ),
      teams!team_id ( team_name, programs!program_id ( name ) ),
      studio_slot_occupancy!occupancy_id ( booking_date, slot_code )
    `),
    supabase.from("personal_studio_bookings").select(`
      id, purpose, booked_at, verification_status, physically_verified_at, no_show_remarks,
      students!student_id ( profiles!user_id ( full_name ) ),
      teams!team_id ( team_name, programs!program_id ( name ) ),
      studio_slot_occupancy!occupancy_id ( booking_date, slot_code )
    `),
  ]);

  const error = portfolioResult.error ?? personalResult.error;
  if (error) {
    console.error("[getAdminStudioSchedule]", error.message);
    return {
      rows: [],
      error:
        /studio_bookings|studio_slot_occupancy|personal_studio_bookings/i.test(
          error.message
        )
          ? "The latest studio booking migration has not been applied."
          : error.message,
    };
  }

  const portfolioRows = (
    (portfolioResult.data ?? []) as unknown as Array<
      ScheduleBase & {
        portfolio_outputs: {
          portfolio_type: StudentCategory;
          students: {
            profiles: { full_name: string } | null;
          } | null;
        } | null;
      }
    >
  )
    .filter(
      (row) =>
        row.studio_slot_occupancy &&
        isStudioSlotCode(row.studio_slot_occupancy.slot_code)
    )
    .map((row) => ({
      id: row.id,
      bookingDate: row.studio_slot_occupancy!.booking_date,
      slotCode: row.studio_slot_occupancy!.slot_code as StudioSlotCode,
      bookedAt: row.booked_at,
      teamName: row.teams?.team_name ?? "—",
      programName: row.teams?.programs?.name ?? null,
      bookingType: "portfolio" as const,
      portfolioType: row.portfolio_outputs?.portfolio_type ?? "photographer",
      purpose: null,
      verificationStatus: row.verification_status,
      physicallyVerifiedAt: row.physically_verified_at,
      noShowRemarks: row.no_show_remarks,
      leaderName: row.portfolio_outputs?.students?.profiles?.full_name ?? "—",
    }));

  const personalRows = (
    (personalResult.data ?? []) as unknown as Array<
      ScheduleBase & {
        purpose: string;
        students: {
          profiles: { full_name: string } | null;
        } | null;
      }
    >
  )
    .filter(
      (row) =>
        row.studio_slot_occupancy &&
        isStudioSlotCode(row.studio_slot_occupancy.slot_code)
    )
    .map((row) => ({
      id: row.id,
      bookingDate: row.studio_slot_occupancy!.booking_date,
      slotCode: row.studio_slot_occupancy!.slot_code as StudioSlotCode,
      bookedAt: row.booked_at,
      teamName: row.teams?.team_name ?? "—",
      programName: row.teams?.programs?.name ?? null,
      bookingType: "personal" as const,
      portfolioType: null,
      purpose: row.purpose,
      verificationStatus: row.verification_status,
      physicallyVerifiedAt: row.physically_verified_at,
      noShowRemarks: row.no_show_remarks,
      leaderName: row.students?.profiles?.full_name ?? "—",
    }));

  let rows = [...portfolioRows, ...personalRows].sort((a, b) =>
    b.bookedAt.localeCompare(a.bookedAt)
  );
  if (bookingDate) {
    rows = rows.filter((row) => row.bookingDate === bookingDate);
  }
  return { rows, error: null };
}
