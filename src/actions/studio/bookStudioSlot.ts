"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BookStudioSlotState = {
  error?: string;
  success?: string;
  booking?: {
    bookingDate: string;
    slotCode: string;
    bookedAt: string;
  };
};

function mapRpcError(message: string): string {
  const migrationMissing =
    /could not find the function/i.test(message) ||
    /function .*book_studio_slot.* does not exist/i.test(message) ||
    /studio_bookings|studio_slot_occupancy/i.test(message);

  if (migrationMissing) {
    return "The database migration has not been applied.";
  }

  const knownMessages = [
    "You do not have permission to perform this action.",
    "Your student profile could not be found.",
    "You are not part of this team.",
    "You are not the current portfolio leader.",
    "This portfolio is locked.",
    "This portfolio is not awaiting a studio booking.",
    "The team is not currently in Stage 3.",
    "This portfolio already has a studio booking.",
    "The selected date is in the past.",
    "Invalid studio slot.",
    "This studio slot was just booked by another team. Please select another available slot.",
  ];

  const match = knownMessages.find((known) => message.includes(known));
  return match ?? "The booking could not be completed.";
}

export async function bookStudioSlotAction(
  _prevState: BookStudioSlotState,
  formData: FormData
): Promise<BookStudioSlotState> {
  const portfolioOutputId = formData.get("portfolio_output_id");
  const bookingDate = formData.get("booking_date");
  const slotCode = formData.get("slot_code");

  if (typeof portfolioOutputId !== "string" || !portfolioOutputId.trim()) {
    return { error: "The booking could not be completed." };
  }

  if (typeof bookingDate !== "string" || !bookingDate.trim()) {
    return { error: "The selected date is in the past." };
  }

  if (typeof slotCode !== "string" || !slotCode.trim()) {
    return { error: "Invalid studio slot." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("book_studio_slot", {
    p_portfolio_output_id: portfolioOutputId,
    p_booking_date: bookingDate,
    p_slot_code: slotCode,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return { error: "The booking could not be completed." };
  }

  const booking = row as {
    booking_date: string;
    slot_code: string;
    booked_at: string;
  };

  revalidatePath("/student/portfolio");

  return {
    success:
      "Studio booked online. Ask Admin for the temporary check-in QR when you arrive; submission stays locked until you scan and confirm attendance.",
    booking: {
      bookingDate: booking.booking_date,
      slotCode: booking.slot_code,
      bookedAt: booking.booked_at,
    },
  };
}
