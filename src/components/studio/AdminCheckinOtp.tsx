"use client";

import { useActionState } from "react";
import {
  generateStudioCheckinOtpAction,
  type CheckinOtpState,
} from "@/actions/studio/checkin";
import { Button } from "@/components/ui/button";

/** Admin-only real-time studio attendance code. */
export function AdminCheckinOtp({
  bookingId,
  bookingType = "portfolio",
}: {
  bookingId: string;
  bookingType?: "portfolio" | "personal";
}) {
  const [state, action, pending] = useActionState<
    CheckinOtpState,
    FormData
  >(generateStudioCheckinOtpAction, {});

  return (
    <div className="space-y-3">
      <form action={action}>
        <input type="hidden" name="booking_id" value={bookingId} />
        <input type="hidden" name="booking_type" value={bookingType} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending
            ? "Generating…"
            : state.otpCode
              ? "Generate a new OTP"
              : "Generate check-in OTP"}
        </Button>
      </form>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.otpCode && state.expiresAt ? (
        <div className="rounded-[var(--radius-card)] border border-brand-gold bg-surface-card p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted">
            One-time studio code
          </p>
          <p className="mt-2 font-mono text-4xl font-bold tracking-[0.25em] text-text-primary">
            {state.otpCode}
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Give this code only to the booked student. It expires in five
            minutes, and generating another code invalidates this one.
          </p>
        </div>
      ) : null}
    </div>
  );
}
