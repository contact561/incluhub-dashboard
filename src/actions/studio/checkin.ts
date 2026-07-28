"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckinOtpState = {
  error?: string;
  otpCode?: string;
  expiresAt?: string;
};
export type VerifyCheckinState = { error?: string; success?: string };

export async function generateStudioCheckinOtpAction(
  _previous: CheckinOtpState,
  formData: FormData
): Promise<CheckinOtpState> {
  const bookingId = formData.get("booking_id");
  const bookingType = formData.get("booking_type");
  if (
    typeof bookingId !== "string" ||
    typeof bookingType !== "string" ||
    !["portfolio", "personal"].includes(bookingType)
  ) {
    return { error: "Studio booking is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_studio_checkin_otp", {
    p_booking_type: bookingType,
    p_booking_id: bookingId,
  });
  if (error) {
    const known = [
      "Studio booking was not found.",
      "This booking is not awaiting studio check-in.",
      "OTP is available from 30 minutes before the slot until the slot ends.",
      "You do not have permission to perform this action.",
    ].find((message) => error.message.includes(message));
    return {
      error:
        known ??
        (/generate_studio_checkin_otp/i.test(error.message)
          ? "The studio OTP migration has not been applied."
          : "The check-in OTP could not be generated."),
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row
    ? { otpCode: row.otp_code, expiresAt: row.expires_at }
    : { error: "The check-in OTP could not be generated." };
}

export async function verifyStudioCheckinOtpAction(
  _previous: VerifyCheckinState,
  formData: FormData
): Promise<VerifyCheckinState> {
  const bookingId = formData.get("booking_id");
  const bookingType = formData.get("booking_type");
  const otpCode = formData.get("otp_code");
  const agreed = formData.get("attendance_confirmed");
  if (
    typeof bookingId !== "string" ||
    typeof bookingType !== "string" ||
    typeof otpCode !== "string" ||
    !/^[0-9]{6}$/.test(otpCode.trim()) ||
    agreed !== "yes"
  ) {
    return {
      error:
        "Enter the six-digit OTP and confirm that you are physically present.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_studio_checkin_otp", {
    p_booking_type: bookingType,
    p_booking_id: bookingId,
    p_otp_code: otpCode.trim(),
  });
  if (error) {
    const known = [
      "Only the booked portfolio leader can use this OTP.",
      "Only the student who booked this shoot can use this OTP.",
      "This booking is not awaiting studio check-in.",
      "Your student profile could not be found.",
      "You do not have permission to perform this action.",
    ].find((message) => error.message.includes(message));
    return { error: known ?? "Studio check-in could not be verified." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.verified) {
    return { error: row?.message ?? "Studio check-in could not be verified." };
  }

  revalidatePath("/student/portfolio");
  revalidatePath("/student/studio");
  revalidatePath("/admin/studio-schedule");
  return { success: row.message };
}

export async function markStudioNoShowAction(formData: FormData) {
  const bookingId = formData.get("booking_id");
  const remarks = formData.get("remarks");
  if (
    typeof bookingId !== "string" ||
    typeof remarks !== "string" ||
    !remarks.trim()
  ) {
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_studio_no_show", {
    p_booking_id: bookingId,
    p_remarks: remarks.trim(),
  });
  if (error) console.error("[markStudioNoShowAction]", error.message);
  revalidatePath("/admin/studio-schedule");
  revalidatePath("/student/portfolio");
}
