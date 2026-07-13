import { createClient } from "@/lib/supabase/server";
import { isStudioSlotCode, type StudioSlotCode } from "@/lib/constants/studioSlots";
import type { AdminStudioScheduleResult } from "@/types/studio-booking";
import type { StudentCategory } from "@/types/database";

export async function getAdminStudioSchedule(
  bookingDate?: string | null
): Promise<AdminStudioScheduleResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("studio_bookings")
    .select(
      `
      id,
      booked_at,
      portfolio_outputs!portfolio_output_id (
        portfolio_type,
        leader_student_id,
        students!leader_student_id (
          profiles!user_id (
            full_name
          )
        )
      ),
      teams!team_id (
        team_name,
        programs!program_id (
          name
        )
      ),
      studio_slot_occupancy!occupancy_id (
        booking_date,
        slot_code
      )
    `
    )
    .order("booked_at", { ascending: false });

  if (error) {
    const migrationMissing =
      /studio_bookings|studio_slot_occupancy/i.test(error.message);

    console.error("[getAdminStudioSchedule]", error.message);
    return {
      rows: [],
      error: migrationMissing
        ? "The database migration has not been applied."
        : error.message,
    };
  }

  let rows = ((data ?? []) as unknown as Array<{
    id: string;
    booked_at: string;
    portfolio_outputs: {
      portfolio_type: StudentCategory;
      students: {
        profiles: { full_name: string } | null;
      } | null;
    } | null;
    teams: {
      team_name: string;
      programs: { name: string } | null;
    } | null;
    studio_slot_occupancy: {
      booking_date: string;
      slot_code: string;
    } | null;
  }>)
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
      portfolioType: row.portfolio_outputs?.portfolio_type ?? "photographer",
      leaderName:
        row.portfolio_outputs?.students?.profiles?.full_name ?? "—",
    }));

  if (bookingDate) {
    rows = rows.filter((row) => row.bookingDate === bookingDate);
  }

  return { rows, error: null };
}
