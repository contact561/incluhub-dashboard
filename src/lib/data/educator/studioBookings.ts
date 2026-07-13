import { createClient } from "@/lib/supabase/server";
import { isStudioSlotCode, type StudioSlotCode } from "@/lib/constants/studioSlots";
import type { EducatorStudioBookingsResult } from "@/types/studio-booking";
import type { StudentCategory } from "@/types/database";

/**
 * Loads confirmed studio bookings for teams assigned to the logged-in educator.
 * Intended for a future educator assigned-team / portfolio view (Package D).
 */
export async function getEducatorStudioBookings(): Promise<EducatorStudioBookingsResult> {
  const supabase = await createClient();

  const { data: educator, error: educatorError } = await supabase
    .from("educators")
    .select("id")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .eq("status", "active")
    .maybeSingle();

  if (educatorError || !educator) {
    return { rows: [], error: educatorError?.message ?? null };
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("team_educators")
    .select("team_id")
    .eq("educator_id", educator.id)
    .eq("status", "active");

  if (assignmentError) {
    return { rows: [], error: assignmentError.message };
  }

  const teamIds = [
    ...new Set(
      ((assignments ?? []) as Array<{ team_id: string }>).map((row) => row.team_id)
    ),
  ];

  if (teamIds.length === 0) {
    return { rows: [], error: null };
  }

  const { data, error } = await supabase
    .from("studio_bookings")
    .select(
      `
      id,
      booked_at,
      team_id,
      portfolio_outputs!portfolio_output_id (
        portfolio_type,
        students!leader_student_id (
          profiles!user_id (
            full_name
          )
        )
      ),
      teams!team_id (
        team_name
      ),
      studio_slot_occupancy!occupancy_id (
        booking_date,
        slot_code
      )
    `
    )
    .in("team_id", teamIds)
    .order("booked_at", { ascending: false });

  if (error) {
    return { rows: [], error: error.message };
  }

  const rows = ((data ?? []) as unknown as Array<{
    id: string;
    booked_at: string;
    portfolio_outputs: {
      portfolio_type: StudentCategory;
      students: {
        profiles: { full_name: string } | null;
      } | null;
    } | null;
    teams: { team_name: string } | null;
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
      portfolioType: row.portfolio_outputs?.portfolio_type ?? "photographer",
      leaderName:
        row.portfolio_outputs?.students?.profiles?.full_name ?? "—",
    }));

  return { rows, error: null };
}
