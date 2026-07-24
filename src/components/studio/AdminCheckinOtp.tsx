"use client";

import { useActionState } from "react";
import {
  createStudioCheckinOtpAction,
  type CheckinOtpState,
} from "@/actions/studio/checkin";
import { Button } from "@/components/ui/button";

export function AdminCheckinOtp({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState<CheckinOtpState, FormData>(
    createStudioCheckinOtpAction,
    {}
  );

  return (
    <div className="space-y-2">
      <form action={action}>
        <input type="hidden" name="booking_id" value={bookingId} />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Generating…" : "Display check-in OTP"}
        </Button>
      </form>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.otpCode ? (
        <div className="rounded-lg border border-border-default bg-white p-3 text-center">
          <p className="text-3xl font-semibold tracking-[0.3em] text-zinc-900">
            {state.otpCode}
          </p>
          <p className="mt-2 text-xs text-zinc-600">
            Read this code to the portfolio leader. Valid for a few minutes.
          </p>
        </div>
      ) : null}
    </div>
  );
}
