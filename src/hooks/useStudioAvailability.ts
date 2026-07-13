"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchStudioSlotAvailability } from "@/lib/data/studio/availability";
import type { StudioSlotAvailability } from "@/types/studio-booking";

export function useStudioAvailability(bookingDate: string | null) {
  const [slots, setSlots] = useState<StudioSlotAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!bookingDate) {
      setSlots([]);
      setError(null);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const result = await fetchStudioSlotAvailability(supabase, bookingDate);
    setSlots(result.slots);
    setError(result.error);
    setLoading(false);
  }, [bookingDate]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!bookingDate) {
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel(`studio-occupancy-${bookingDate}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "studio_slot_occupancy",
          filter: `booking_date=eq.${bookingDate}`,
        },
        () => {
          void refetch();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bookingDate, refetch]);

  return { slots, loading, error, refetch };
}
