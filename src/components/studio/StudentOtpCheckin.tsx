"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  verifyStudioCheckinOtpAction,
  type VerifyCheckinState,
} from "@/actions/studio/checkin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Student entry form for a booked portfolio or personal shoot. */
export function StudentOtpCheckin({
  bookingId,
  bookingType = "portfolio",
}: {
  bookingId: string;
  bookingType?: "portfolio" | "personal";
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    VerifyCheckinState,
    FormData
  >(verifyStudioCheckinOtpAction, {});

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <section className="mt-4 rounded-[var(--radius-control)] border border-brand-gold/50 bg-surface-muted p-4">
      <h3 className="font-medium text-text-primary">
        Enter the studio check-in OTP
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        Ask Admin to generate the real-time six-digit code when you arrive for
        the booked slot. The code expires after five minutes.
      </p>
      <form action={action} className="mt-4 max-w-sm space-y-3">
        <input type="hidden" name="booking_id" value={bookingId} />
        <input type="hidden" name="booking_type" value={bookingType} />
        <div className="space-y-2">
          <Label htmlFor={`otp-${bookingType}-${bookingId}`}>
            Six-digit OTP
          </Label>
          <Input
            id={`otp-${bookingType}-${bookingId}`}
            name="otp_code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            disabled={pending}
            className="font-mono text-lg tracking-[0.25em]"
            placeholder="000000"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            name="attendance_confirmed"
            value="yes"
            required
            className="mt-1"
          />
          I confirm that I am the booked student and I am physically present at
          the IncluHub studio.
        </label>
        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-status-success" role="status">
            {state.success}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Verifying…" : "Verify OTP and check in"}
        </Button>
      </form>
    </section>
  );
}
