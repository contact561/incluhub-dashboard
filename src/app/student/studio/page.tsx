import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState, StatusPanel } from "@/components/status";
import { PersonalStudioBookingPanel } from "@/components/studio/PersonalStudioBookingPanel";
import { StudentOtpCheckin } from "@/components/studio/StudentOtpCheckin";
import {
  formatStudioBookedAt,
  formatStudioBookingDate,
  STUDIO_SLOT_LABELS,
} from "@/lib/constants/studioSlots";
import { getPersonalStudioData } from "@/lib/data/student/personalStudio";

export default async function StudentPersonalStudioPage() {
  const result = await getPersonalStudioData();
  if (result.error || !result.data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Personal Studio"
          description="Your two individual shoots after Stage 5."
        />
        <QueryErrorState
          title="Personal studio unavailable"
          message={result.error ?? "Your credits could not be loaded."}
        />
      </div>
    );
  }

  const { data } = result;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal Studio"
        description="Two individual studio shoots are issued to every selected student after Stage 5."
        metadata={
          <span>
            {data.remainingCredits} of {data.totalCredits} credits remaining
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Total credits", data.totalCredits],
          ["Used", data.usedCredits],
          ["Remaining", data.remainingCredits],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4"
          >
            <p className="text-sm text-text-muted">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-text-primary">
              {value}
            </p>
          </div>
        ))}
      </div>

      {data.remainingCredits > 0 ? (
        <PersonalStudioBookingPanel
          studentId={data.studentId}
          remainingCredits={data.remainingCredits}
        />
      ) : (
        <StatusPanel
          title="Both personal shoot credits have been used"
          description="Your confirmed bookings remain available below for attendance check-in."
        />
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            My personal shoots
          </h2>
          <p className="text-sm text-text-muted">
            Only you can enter the OTP for your personal booking.
          </p>
        </div>
        {data.bookings.length === 0 ? (
          <EmptyState
            title="No personal shoots booked"
            description="Your first confirmed personal shoot will appear here."
          />
        ) : (
          <div className="space-y-3">
            {data.bookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-text-primary">
                      {formatStudioBookingDate(booking.bookingDate)}
                    </h3>
                    <p className="mt-1 text-sm text-text-muted">
                      {STUDIO_SLOT_LABELS[booking.slotCode]}
                    </p>
                  </div>
                  <span className="rounded-full border border-brand-gold/60 px-3 py-1 text-xs font-medium text-text-primary">
                    {booking.verificationStatus === "physically_verified"
                      ? "Checked in"
                      : booking.verificationStatus === "no_show"
                        ? "No-show"
                        : "OTP check-in pending"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-primary">
                  {booking.purpose}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Booked {formatStudioBookedAt(booking.bookedAt)}
                </p>
                {booking.verificationStatus === "online_confirmed" ? (
                  <StudentOtpCheckin
                    bookingId={booking.id}
                    bookingType="personal"
                  />
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
