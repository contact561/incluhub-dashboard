"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bookStudioSlotAction,
  type BookStudioSlotState,
} from "@/actions/studio/bookStudioSlot";
import { StudioSlotGrid } from "@/components/studio/StudioSlotGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTodayInAsiaKolkata,
  type StudioSlotCode,
} from "@/lib/constants/studioSlots";
import { useStudioAvailability } from "@/hooks/useStudioAvailability";

type StudioBookingPanelProps = {
  portfolioOutputId: string;
};

const initialState: BookStudioSlotState = {};

export function StudioBookingPanel({ portfolioOutputId }: StudioBookingPanelProps) {
  const router = useRouter();
  const [bookingDate, setBookingDate] = useState(getTodayInAsiaKolkata());
  const [selectedSlot, setSelectedSlot] = useState<StudioSlotCode | null>(null);
  const [pendingSlot, setPendingSlot] = useState<StudioSlotCode | null>(null);
  const [state, formAction, isPending] = useActionState(
    bookStudioSlotAction,
    initialState
  );

  const { slots, loading, error } = useStudioAvailability(
    bookingDate,
    portfolioOutputId
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  const handleSubmit = () => {
    if (selectedSlot) {
      setPendingSlot(selectedSlot);
    }
  };

  // Derived instead of reset-in-effect: the pending highlight is only
  // meaningful while the booking action is in flight.
  const activePendingSlot = isPending ? pendingSlot : null;

  return (
    <section className="rounded-lg border border-zinc-200 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Book studio slot</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Select a date and one of five daily IncluHub studio slots. Bookings are
        free, final, and cannot be changed after confirmation.
      </p>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`booking-date-${portfolioOutputId}`}>Booking date</Label>
          <Input
            id={`booking-date-${portfolioOutputId}`}
            type="date"
            min={getTodayInAsiaKolkata()}
            value={bookingDate}
            onChange={(event) => {
              setBookingDate(event.target.value);
              setSelectedSlot(null);
            }}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label>Available slots (Asia/Kolkata)</Label>
          <StudioSlotGrid
            slots={slots}
            selectedSlot={selectedSlot}
            pendingSlot={activePendingSlot}
            loading={loading}
            disabled={isPending}
            onSelect={setSelectedSlot}
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="text-sm text-green-700" role="status">
            {state.success}
          </p>
        ) : null}

        {selectedSlot ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Final booking warning: once confirmed, this studio slot cannot be
            cancelled, edited, or rescheduled.
          </p>
        ) : null}

        <form action={formAction} onSubmit={handleSubmit}>
          <input type="hidden" name="portfolio_output_id" value={portfolioOutputId} />
          <input type="hidden" name="booking_date" value={bookingDate} />
          <input type="hidden" name="slot_code" value={selectedSlot ?? ""} />

          <Button
            type="submit"
            disabled={isPending || !selectedSlot || loading}
          >
            {isPending ? "Booking…" : "Confirm Booking"}
          </Button>
        </form>
      </div>
    </section>
  );
}
