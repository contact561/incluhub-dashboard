"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STUDIO_SLOT_CODES } from "@/lib/constants/studioSlots";

export type SaveAvailabilityState = { error?: string; success?: string };

export async function saveStudioAvailabilityAction(
  _previous: SaveAvailabilityState,
  formData: FormData
): Promise<SaveAvailabilityState> {
  const portfolioOutputId = formData.get("portfolio_output_id");
  const bookingDate = formData.get("booking_date");
  const slots = formData.getAll("slot_code").filter(
    (value): value is string => typeof value === "string" && STUDIO_SLOT_CODES.includes(value as never)
  );
  if (typeof portfolioOutputId !== "string" || typeof bookingDate !== "string" || slots.length === 0) {
    return { error: "Choose a date and at least one studio timing." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_studio_availability", {
    p_portfolio_output_id: portfolioOutputId,
    p_slots: slots.map((slotCode) => ({ booking_date: bookingDate, slot_code: slotCode })),
  });
  if (error) {
    const known = [
      "Select between 1 and 20 available timings.",
      "Availability can only be updated before the studio is booked.",
      "Only an assistant on this portfolio can update availability.",
      "Availability must be within the next 14 days.",
      "The team is not currently in Stage 3.",
    ].find((message) => error.message.includes(message));
    return { error: known ?? "Your availability could not be saved." };
  }
  revalidatePath("/student/portfolio");
  return { success: "Your available timings were shared with the portfolio leader." };
}

