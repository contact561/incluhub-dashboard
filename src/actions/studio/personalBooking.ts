"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PersonalBookingState = {
  error?: string;
  success?: string;
};

export async function bookPersonalStudioSlotAction(
  _previous: PersonalBookingState,
  formData: FormData
): Promise<PersonalBookingState> {
  const bookingDate = formData.get("booking_date");
  const slotCode = formData.get("slot_code");
  const purpose = formData.get("purpose");
  if (
    typeof bookingDate !== "string" ||
    typeof slotCode !== "string" ||
    typeof purpose !== "string"
  ) {
    return { error: "Complete the date, slot and shoot purpose." };
  }
  const cleanPurpose = purpose.trim();
  if (cleanPurpose.length < 3 || cleanPurpose.length > 500) {
    return { error: "Shoot purpose must be between 3 and 500 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("book_personal_studio_slot", {
    p_booking_date: bookingDate,
    p_slot_code: slotCode,
    p_purpose: cleanPurpose,
  });
  if (error) {
    const known = [
      "Personal shoots unlock after Admin grants Stage 5 ecosystem access.",
      "You have used both personal studio shoot credits.",
      "Personal shoot bookings must be within the next 14 days.",
      "This studio slot was just booked. Please select another available slot.",
    ].find((message) => error.message.includes(message));
    return {
      error:
        known ??
        (/book_personal_studio_slot/i.test(error.message)
          ? "The personal studio booking migration has not been applied."
          : "The personal studio shoot could not be booked."),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  revalidatePath("/student/studio");
  revalidatePath("/admin/studio-schedule");
  return {
    success: `Personal studio shoot booked. ${
      row?.credits_remaining ?? 0
    } credit${row?.credits_remaining === 1 ? "" : "s"} remaining.`,
  };
}
