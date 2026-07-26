"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

let channelInstanceCounter = 0;

/**
 * Refreshes the RSC tree when this user gets a new/updated notification row.
 * Relies on Supabase Realtime + RLS on notification_recipients.
 */
export function NotificationRealtimeRefresh({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    channelInstanceCounter += 1;
    const channel = supabase
      .channel(`notification-recipients-${userId}-${channelInstanceCounter}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_recipients",
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
