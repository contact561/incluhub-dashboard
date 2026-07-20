"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckinQrState = { error?: string; token?: string; expiresAt?: string };
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

export async function verifyStudioCheckinAction(
  _previous: VerifyCheckinState,
  formData: FormData
): Promise<VerifyCheckinState> {
  const token = formData.get("qr_token");
  const agreed = formData.get("attendance_confirmed");
  if (typeof token !== "string" || !token || agreed !== "yes") {
    return { error: "Scan the Admin QR and confirm that you are physically present." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_studio_checkin", { p_qr_token: token });
  if (error) {
    const known = [
      "This check-in QR is invalid or expired.",
      "Only the current portfolio leader can use this check-in QR.",
      "This booking is not awaiting physical check-in.",
      "This portfolio is not awaiting physical check-in.",
    ].find((message) => error.message.includes(message));
    return { error: known ?? "Studio check-in could not be verified." };
  }
  revalidatePath("/student/portfolio");
  revalidatePath("/admin/studio-schedule");
  return { success: "Physical check-in verified. Your portfolio submission is now open." };
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

