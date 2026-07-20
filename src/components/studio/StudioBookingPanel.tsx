"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bookStudioSlotAction,
  type BookStudioSlotState,
} from "@/actions/studio/bookStudioSlot";
import { StudioSlotGrid } from "@/components/studio/StudioSlotGrid";
import { StatusPanel } from "@/components/status/StatusPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTodayInAsiaKolkata,
  type StudioSlotCode,
} from "@/lib/constants/studioSlots";
import { useStudioAvailability } from "@/hooks/useStudioAvailability";
import { AssistantAvailabilitySummary } from "@/components/studio/AssistantAvailabilitySummary";
import type { AssistantAvailabilityChoice } from "@/types/studio-booking";

type StudioBookingPanelProps = {
  portfolioOutputId: string;
  assistantAvailability: AssistantAvailabilityChoice[];
};

const initialState: BookStudioSlotState = {};

export function StudioBookingPanel({ portfolioOutputId, assistantAvailability }: StudioBookingPanelProps) {
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

  const activePendingSlot = isPending ? pendingSlot : null;

  return (
    <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-muted/40 p-4">
      <h3 className="text-sm font-semibold text-text-primary">Book studio slot</h3>
      <p className="mt-1 text-sm text-text-muted">
        Review your assistants&apos; preferred timings, then select a live studio slot.
        Recommendations do not reserve the studio.
      </p>
      <AssistantAvailabilitySummary choices={assistantAvailability} />

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
            className="min-h-11 w-full max-w-full sm:max-w-xs"
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
          <StatusPanel
            variant="success"
            title="Booking confirmed"
            description={state.success}
          />
        ) : null}

        {selectedSlot ? (
          <StatusPanel
            variant="warning"
            title="Final booking warning"
            description="Confirm that this timing works for your team. After booking, physical Admin QR check-in is required before submission opens."
          />
        ) : null}

        <form action={formAction} onSubmit={handleSubmit}>
          <input type="hidden" name="portfolio_output_id" value={portfolioOutputId} />
          <input type="hidden" name="booking_date" value={bookingDate} />
          <input type="hidden" name="slot_code" value={selectedSlot ?? ""} />

          <Button
            type="submit"
            className="min-h-11 w-full sm:w-auto"
            disabled={isPending || !selectedSlot || loading}
          >
            {isPending ? "Booking…" : "Confirm Booking"}
          </Button>
        </form>
      </div>
    </section>
  );
}
