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
};

export function ConfirmedBookingCard({
  booking,
  showSubmissionHint = false,
}: ConfirmedBookingCardProps) {
  return (
    <StatusPanel
      variant="success"
      title="Studio booking confirmed"
      description={
        showSubmissionHint
          ? "This booking is final and cannot be cancelled or rescheduled. Portfolio submission is the next step."
          : "This booking is final and cannot be cancelled or rescheduled."
      }
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
