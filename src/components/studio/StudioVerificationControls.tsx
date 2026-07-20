import { markStudioNoShowAction } from "@/actions/studio/checkin";
import { AdminCheckinQr } from "@/components/studio/AdminCheckinQr";
import { Button } from "@/components/ui/button";

export function StudioVerificationControls({ bookingId, status }: { bookingId: string; status: "online_confirmed" | "physically_verified" | "no_show" }) {
  if (status === "physically_verified") return <p className="text-sm text-status-success">Physical check-in verified.</p>;
  if (status === "no_show") return <p className="text-sm text-text-muted">No-show recorded; rebooking is available.</p>;
  return <div className="space-y-3">
    <AdminCheckinQr bookingId={bookingId} />
    <details className="text-sm">
      <summary className="cursor-pointer text-text-muted">Mark no-show</summary>
      <form action={markStudioNoShowAction} className="mt-2 space-y-2">
        <input type="hidden" name="booking_id" value={bookingId} />
        <textarea name="remarks" required maxLength={1000} rows={2} placeholder="Required operational note" className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2" />
        <Button type="submit" variant="destructive" size="sm">Confirm no-show</Button>
      </form>
    </details>
  </div>;
}

