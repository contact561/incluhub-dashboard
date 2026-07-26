"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckinQrState = { error?: string; token?: string; expiresAt?: string };
export type CheckinOtpState = { error?: string; otpCode?: string; expiresAt?: string };
export type VerifyCheckinState = { error?: string; success?: string };

export async function createStudioCheckinQrAction(
  _previous: CheckinQrState,
  formData: FormData
): Promise<CheckinQrState> {
  const bookingId = formData.get("booking_id");
  if (typeof bookingId !== "string" || !bookingId) return { error: "Studio booking is required." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_studio_checkin_qr", { p_booking_id: bookingId });
  if (error) {
    const known = [
      "Studio booking was not found.",
      "This booking is not awaiting physical check-in.",
      "Check-in QR is available from 30 minutes before the slot until the slot ends.",
      "You do not have permission to perform this action.",
    ].find((message) => error.message.includes(message));
    return { error: known ?? "The check-in QR could not be generated." };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ? { token: row.qr_token, expiresAt: row.expires_at } : { error: "The check-in QR could not be generated." };
}

export async function createStudioCheckinOtpAction(
  _previous: CheckinOtpState,
  formData: FormData
): Promise<CheckinOtpState> {
  const bookingId = formData.get("booking_id");
  if (typeof bookingId !== "string" || !bookingId) {
    return { error: "Studio booking is required." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_studio_checkin_otp", {
    p_booking_id: bookingId,
  });
  if (error) {
    const known = [
      "Studio booking was not found.",
      "This booking is not awaiting physical check-in.",
      "Check-in OTP is available from 30 minutes before the slot until the slot ends.",
      "You do not have permission to perform this action.",
    ].find((message) => error.message.includes(message));
    return { error: known ?? "The check-in OTP could not be generated." };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row
    ? { otpCode: row.otp_code, expiresAt: row.expires_at }
    : { error: "The check-in OTP could not be generated." };
}

export async function verifyStudioCheckinAction(
  _previous: VerifyCheckinState,
  formData: FormData
): Promise<VerifyCheckinState> {
  const token = formData.get("qr_token");
  const otp = formData.get("otp_code");
  const agreed = formData.get("attendance_confirmed");
  if (agreed !== "yes") {
    return { error: "Confirm that you are physically present." };
  }

  const supabase = await createClient();

  if (typeof otp === "string" && otp.trim()) {
    const { error } = await supabase.rpc("verify_studio_checkin_otp", {
      p_otp_code: otp.trim(),
    });
    if (error) {
      const known = [
        "This check-in OTP is invalid or expired.",
        "Only the current portfolio leader can use this check-in OTP.",
        "This booking is not awaiting physical check-in.",
        "This portfolio is not awaiting physical check-in.",
        "Your student profile could not be found.",
        "You do not have permission to perform this action.",
      ].find((message) => error.message.includes(message));
      return { error: known ?? "Studio check-in could not be verified." };
    }
  } else if (typeof token === "string" && token) {
    const { error } = await supabase.rpc("verify_studio_checkin", { p_qr_token: token });
    if (error) {
      const known = [
        "This check-in QR is invalid or expired.",
        "Only the current portfolio leader can use this check-in QR.",
        "This booking is not awaiting physical check-in.",
        "This portfolio is not awaiting physical check-in.",
        "You are not part of this team.",
        "The team is not currently in Stage 3.",
        "This portfolio is not the active Stage 3 sequence.",
        "Your student profile could not be found.",
        "You do not have permission to perform this action.",
      ].find((message) => error.message.includes(message));
      return { error: known ?? "Studio check-in could not be verified." };
    }
  } else {
    return { error: "Scan the Admin QR or enter the OTP, then confirm attendance." };
  }

  revalidatePath("/student/portfolio");
  revalidatePath("/admin/studio-schedule");
  return {
    success:
      "Check-in complete. Portfolio submission is unlocked for this leader account.",
  };
}

export async function markStudioNoShowAction(formData: FormData) {
  const bookingId = formData.get("booking_id");
  const remarks = formData.get("remarks");
  if (typeof bookingId !== "string" || typeof remarks !== "string" || !remarks.trim()) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_studio_no_show", {
    p_booking_id: bookingId,
    p_remarks: remarks.trim(),
  });
  if (error) console.error("[markStudioNoShowAction]", error.message);
  revalidatePath("/admin/studio-schedule");
  revalidatePath("/student/portfolio");
}

export async function grantStudioRebookPermitAction(formData: FormData) {
  const portfolioId = formData.get("portfolio_output_id");
  const reason = formData.get("reason");
  if (typeof portfolioId !== "string" || !portfolioId) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("grant_studio_rebook_permit", {
    p_portfolio_output_id: portfolioId,
    p_reason: typeof reason === "string" ? reason.trim() || null : null,
  });
  if (error) console.error("[grantStudioRebookPermitAction]", error.message);
  revalidatePath("/admin/studio-schedule");
  revalidatePath("/student/portfolio");
}

