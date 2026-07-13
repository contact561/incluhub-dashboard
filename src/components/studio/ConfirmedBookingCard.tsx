import {
  formatStudioBookedAt,
  formatStudioBookingDate,
  STUDIO_SLOT_LABELS,
} from "@/lib/constants/studioSlots";
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
    <section className="rounded-lg border border-green-200 bg-green-50 p-4">
      <h3 className="text-sm font-semibold text-green-900">
        Studio booking confirmed
      </h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-green-700">
            Date
          </dt>
          <dd className="text-green-900">
            {formatStudioBookingDate(booking.bookingDate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-green-700">
            Time slot
          </dt>
          <dd className="text-green-900">
            {STUDIO_SLOT_LABELS[booking.slotCode]}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-green-700">
            Booked at
          </dt>
          <dd className="text-green-900">
            {formatStudioBookedAt(booking.bookedAt)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-green-800">
        This booking is final and cannot be cancelled or rescheduled.
      </p>
      {showSubmissionHint ? (
        <p className="mt-2 text-xs text-green-800">
          Portfolio submission is the next step for this portfolio.
        </p>
      ) : null}
    </section>
  );
}
