import {
  formatStudioBookedAt,
  formatStudioBookingDate,
  STUDIO_SLOT_LABELS,
} from "@/lib/constants/studioSlots";
import { StatusPanel } from "@/components/status/StatusPanel";
import type { ConfirmedStudioBooking } from "@/types/studio-booking";

type ConfirmedBookingCardProps = {
  booking: ConfirmedStudioBooking;
  showSubmissionHint?: boolean;
  showCheckinHint?: boolean;
};

export function ConfirmedBookingCard({
  booking,
  showSubmissionHint = false,
  showCheckinHint = false,
}: ConfirmedBookingCardProps) {
  const description = showSubmissionHint
    ? "Physical check-in is complete. This booking is final. Submit your portfolio from this account."
    : showCheckinHint
      ? "This booking is final and cannot be cancelled or rescheduled. Enter the Admin-generated OTP at the studio to unlock portfolio submission."
      : "This booking is final and cannot be cancelled or rescheduled.";

  return (
    <StatusPanel
      variant="success"
      title="Studio booking confirmed"
      description={description}
    >
      <dl className="mt-1 space-y-2 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Date
          </dt>
          <dd className="text-text-primary">
            {formatStudioBookingDate(booking.bookingDate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Time slot
          </dt>
          <dd className="text-text-primary">
            {STUDIO_SLOT_LABELS[booking.slotCode]}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Booked at
          </dt>
          <dd className="text-text-primary">
            {formatStudioBookedAt(booking.bookedAt)}
          </dd>
        </div>
      </dl>
    </StatusPanel>
  );
}
