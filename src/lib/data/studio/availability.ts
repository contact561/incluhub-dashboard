import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { StudioSlotAvailability } from "@/types/studio-booking";
import type { StudioSlotCode } from "@/lib/constants/studioSlots";
import { isStudioSlotCode } from "@/lib/constants/studioSlots";

type Supabase = SupabaseClient<Database>;

export async function fetchStudioSlotAvailability(
  supabase: Supabase,
  bookingDate: string
): Promise<{ slots: StudioSlotAvailability[]; error: string | null }> {
  const { data, error } = await supabase.rpc("get_studio_slot_availability", {
    p_booking_date: bookingDate,
  });

  if (error) {
    const migrationMissing =
      /could not find the function/i.test(error.message) ||
      /function .*get_studio_slot_availability.* does not exist/i.test(
        error.message
      );

    return {
      slots: [],
      error: migrationMissing
        ? "The database migration has not been applied."
        : "Studio availability could not be loaded.",
    };
  }

  const slots: StudioSlotAvailability[] = (data ?? [])
    .filter(
      (row): row is { slot_code: string; available: boolean } =>
        typeof row.slot_code === "string" && typeof row.available === "boolean"
    )
    .map((row) => ({
      slotCode: isStudioSlotCode(row.slot_code)
        ? row.slot_code
        : (row.slot_code as StudioSlotCode),
      available: row.available,
    }));

  return { slots, error: null };
}
