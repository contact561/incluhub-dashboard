import {
  grantStudioRebookPermitAction,
  markStudioNoShowAction,
} from "@/actions/studio/checkin";
import { AdminCheckinOtp } from "@/components/studio/AdminCheckinOtp";
import { AdminCheckinQr } from "@/components/studio/AdminCheckinQr";
import { Button } from "@/components/ui/button";

export function StudioVerificationControls({
  bookingId,
  portfolioOutputId,
  status,
}: {
  bookingId: string;
  portfolioOutputId: string;
  status: "online_confirmed" | "physically_verified" | "no_show";
}) {
  if (status === "physically_verified") {
    return (
      <p className="text-sm text-status-success">
        Student checked in; submission unlocked for leader.
      </p>
    );
  }

  if (status === "no_show") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-muted">
          No-show recorded. A rebook permit was auto-granted so the leader can
          book again. Use Grant rebook if they need another extra attempt later.
        </p>
        <form action={grantStudioRebookPermitAction} className="space-y-2">
          <input type="hidden" name="portfolio_output_id" value={portfolioOutputId} />
          <input
            type="hidden"
            name="reason"
            value="Manual rebook permit from studio schedule"
          />
          <Button type="submit" size="sm" variant="outline">
            Grant another rebook permit
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Display QR and/or OTP for the authenticated portfolio leader. Successful
        check-in unlocks submission — no further Admin approval required.
      </p>
      <AdminCheckinQr bookingId={bookingId} />
      <AdminCheckinOtp bookingId={bookingId} />
      <details className="text-sm">
        <summary className="cursor-pointer text-text-muted">Mark no-show</summary>
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
    </div>
  );
}
