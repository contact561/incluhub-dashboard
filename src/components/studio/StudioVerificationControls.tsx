import { markStudioNoShowAction } from "@/actions/studio/checkin";
import { AdminCheckinOtp } from "@/components/studio/AdminCheckinOtp";
import { Button } from "@/components/ui/button";

export function StudioVerificationControls({
  bookingId,
  status,
  bookingType = "portfolio",
}: {
  bookingId: string;
  status: "online_confirmed" | "physically_verified" | "no_show";
  bookingType?: "portfolio" | "personal";
}) {
  if (status === "physically_verified") {
    return (
      <p className="text-sm text-status-success">
        Student entered the OTP successfully; studio attendance is confirmed.
      </p>
    );
  }

  if (status === "no_show") {
    return (
      <p className="text-sm text-text-muted">
        No-show recorded for this studio booking.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Generate a real-time six-digit OTP for the booked student. Successful
        entry confirms physical attendance and unlocks the next action.
      </p>
      <AdminCheckinOtp bookingId={bookingId} bookingType={bookingType} />
      {bookingType === "portfolio" ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-text-muted">
            Mark no-show
          </summary>
          <form action={markStudioNoShowAction} className="mt-2 space-y-2">
            <input type="hidden" name="booking_id" value={bookingId} />
            <textarea
              name="remarks"
              required
              maxLength={1000}
              rows={2}
              placeholder="Required operational note"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2"
            />
            <Button type="submit" variant="destructive" size="sm">
              Confirm no-show
            </Button>
          </form>
        </details>
      ) : null}
    </div>
  );
}
