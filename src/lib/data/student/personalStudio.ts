import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import {
  isStudioSlotCode,
  type StudioSlotCode,
} from "@/lib/constants/studioSlots";
import { createClient } from "@/lib/supabase/server";
import type {
  PersonalStudioResult,
  PersonalStudioBookingView,
} from "@/types/studio-booking";

export async function getPersonalStudioData(): Promise<PersonalStudioResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "student" || profile.status !== "active") {
    return { data: null, error: "You do not have access to personal shoots." };
  }

  const supabase = await createClient();
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, ecosystem_access_status")
    .eq("user_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (studentError || !student) {
    return {
      data: null,
      error: studentError?.message ?? "Your active student record was not found.",
    };
  }
  if (student.ecosystem_access_status !== "granted") {
    return {
      data: null,
      error: "Personal studio shoots unlock after Admin grants Stage 5 access.",
    };
  }

  const [entitlementResult, bookingsResult] = await Promise.all([
    supabase
      .from("personal_shoot_entitlements")
      .select("total_credits, used_credits")
      .eq("student_id", student.id)
      .maybeSingle(),
    supabase
      .from("personal_studio_bookings")
      .select(
        `
        id,
        purpose,
        booked_at,
        verification_status,
        physically_verified_at,
        studio_slot_occupancy!occupancy_id (
          booking_date,
          slot_code
        )
      `
      )
      .eq("student_id", student.id)
      .order("booked_at", { ascending: false }),
  ]);

  if (entitlementResult.error || bookingsResult.error) {
    const message =
      entitlementResult.error?.message ?? bookingsResult.error?.message ?? "";
    const migrationMissing =
      /personal_shoot_entitlements|personal_studio_bookings/i.test(message);
    return {
      data: null,
      error: migrationMissing
        ? "The personal studio migration has not been applied."
        : "Your personal studio bookings could not be loaded.",
    };
  }

  const entitlement = entitlementResult.data;
  if (!entitlement) {
    return {
      data: null,
      error: "Your two personal shoot credits have not been issued yet.",
    };
  }

  const bookings = ((bookingsResult.data ?? []) as unknown as Array<{
    id: string;
    purpose: string;
    booked_at: string;
    verification_status: PersonalStudioBookingView["verificationStatus"];
    physically_verified_at: string | null;
    studio_slot_occupancy: {
      booking_date: string;
      slot_code: string;
    } | null;
  }>)
    .filter(
      (booking) =>
        booking.studio_slot_occupancy &&
        isStudioSlotCode(booking.studio_slot_occupancy.slot_code)
    )
    .map((booking) => ({
      id: booking.id,
      bookingDate: booking.studio_slot_occupancy!.booking_date,
      slotCode: booking.studio_slot_occupancy!.slot_code as StudioSlotCode,
      purpose: booking.purpose,
      bookedAt: booking.booked_at,
      verificationStatus: booking.verification_status,
      physicallyVerifiedAt: booking.physically_verified_at,
    })) satisfies PersonalStudioBookingView[];

  return {
    data: {
      studentId: student.id,
      totalCredits: entitlement.total_credits,
      usedCredits: entitlement.used_credits,
      remainingCredits: Math.max(
        entitlement.total_credits - entitlement.used_credits,
        0
      ),
      bookings,
    },
    error: null,
  };
}
