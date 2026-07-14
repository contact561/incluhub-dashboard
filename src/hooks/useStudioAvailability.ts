"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchStudioSlotAvailability } from "@/lib/data/studio/availability";
import type { StudioSlotAvailability } from "@/types/studio-booking";

type AvailabilityResult = {
  bookingDate: string | null;
  slots: StudioSlotAvailability[];
  error: string | null;
};

const EMPTY_RESULT: AvailabilityResult = {
  bookingDate: null,
  slots: [],
  error: null,
};

/**
 * The browser Supabase client is a shared singleton, and supabase-js returns
 * the existing channel when a topic name is reused. Reusing a topic across
 * hook instances (remounts, StrictMode, multiple cards) means `.on()` runs on
 * an already-subscribed channel and throws. A per-effect counter keeps every
 * channel instance unique.
 */
let channelInstanceCounter = 0;

export function useStudioAvailability(
  bookingDate: string | null,
  portfolioOutputId: string
) {
  const [result, setResult] = useState<AvailabilityResult>(EMPTY_RESULT);

  const refetch = useCallback(async () => {
    if (!bookingDate) {
      return;
    }

    const supabase = createClient();
    const response = await fetchStudioSlotAvailability(supabase, bookingDate);
    setResult({
      bookingDate,
      slots: response.slots,
      error: response.error,
    });
  }, [bookingDate]);

  useEffect(() => {
    if (!bookingDate) {
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    const loadAvailability = async () => {
      const response = await fetchStudioSlotAvailability(supabase, bookingDate);
      if (!cancelled) {
        setResult({
          bookingDate,
          slots: response.slots,
          error: response.error,
        });
      }
    };

    void loadAvailability();

    channelInstanceCounter += 1;
    const channelName = `studio-occupancy-${bookingDate}-${portfolioOutputId}-${channelInstanceCounter}`;

    // All .on() callbacks are registered before .subscribe(); the channel is
    // created fresh for this effect and never reused after cleanup.
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "studio_slot_occupancy",
          filter: `booking_date=eq.${bookingDate}`,
        },
        () => {
          void loadAvailability();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [bookingDate, portfolioOutputId]);

  const matchesCurrentDate =
    bookingDate !== null && result.bookingDate === bookingDate;
  const slots = matchesCurrentDate ? result.slots : [];
  const error = matchesCurrentDate ? result.error : null;
  const loading = bookingDate !== null && !matchesCurrentDate;

  return { slots, loading, error, refetch };
}
