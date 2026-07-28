"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bookPersonalStudioSlotAction,
  type PersonalBookingState,
} from "@/actions/studio/personalBooking";
import { StudioSlotGrid } from "@/components/studio/StudioSlotGrid";
import { StatusPanel } from "@/components/status/StatusPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudioAvailability } from "@/hooks/useStudioAvailability";
import {
  getTodayInAsiaKolkata,
  type StudioSlotCode,
} from "@/lib/constants/studioSlots";

export function PersonalStudioBookingPanel({
  studentId,
  remainingCredits,
}: {
  studentId: string;
  remainingCredits: number;
}) {
  const router = useRouter();
  const [bookingDate, setBookingDate] = useState(getTodayInAsiaKolkata());
  const [selectedSlot, setSelectedSlot] = useState<StudioSlotCode | null>(null);
  const [pendingSlot, setPendingSlot] = useState<StudioSlotCode | null>(null);
  const [state, action, pending] = useActionState<PersonalBookingState, FormData>(
    bookPersonalStudioSlotAction,
    {}
  );
  const { slots, loading, error } = useStudioAvailability(
    bookingDate,
    `personal-${studentId}`
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <section className="rounded-[var(--radius-card)] border border-brand-gold/50 bg-surface-card p-5">
      <h2 className="text-lg font-semibold text-text-primary">
        Book a personal studio shoot
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Each booking uses one credit. Choose a live slot within the next 14
        days, then enter the Admin-generated OTP when you arrive.
      </p>

      <form
        action={action}
        className="mt-5 space-y-4"
        onSubmit={() => setPendingSlot(selectedSlot)}
      >
        <div className="space-y-2">
          <Label htmlFor="personal-booking-date">Booking date</Label>
          <Input
            id="personal-booking-date"
            name="booking_date"
            type="date"
            min={getTodayInAsiaKolkata()}
            value={bookingDate}
            onChange={(event) => {
              setBookingDate(event.target.value);
              setSelectedSlot(null);
            }}
            disabled={pending}
            className="min-h-11 max-w-xs"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Available slots (Asia/Kolkata)</Label>
          <StudioSlotGrid
            slots={slots}
            selectedSlot={selectedSlot}
            pendingSlot={pending ? pendingSlot : null}
            loading={loading}
            disabled={pending || remainingCredits < 1}
            onSelect={setSelectedSlot}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="personal-purpose">Purpose of the shoot</Label>
          <textarea
            id="personal-purpose"
            name="purpose"
            rows={3}
            minLength={3}
            maxLength={500}
            required
            disabled={pending}
            placeholder="Example: personal fashion editorial and portfolio practice"
            className="w-full rounded-[var(--radius-control)] border border-input bg-surface-card px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <input type="hidden" name="slot_code" value={selectedSlot ?? ""} />

        {error || state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error ?? error}
          </p>
        ) : null}
        {state.success ? (
          <StatusPanel
            variant="success"
            title="Personal shoot booked"
            description={state.success}
          />
        ) : null}

        <Button
          type="submit"
          disabled={
            pending || loading || !selectedSlot || remainingCredits < 1
          }
        >
          {pending ? "Booking…" : "Use one credit and book"}
        </Button>
      </form>
    </section>
  );
}
