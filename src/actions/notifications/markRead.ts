"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function refreshNotificationSurfaces() {
  revalidatePath("/admin", "layout");
  revalidatePath("/student", "layout");
  revalidatePath("/educator", "layout");
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = formData.get("notification_id");
  if (typeof notificationId !== "string" || !notificationId) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });
  if (error) console.error("[markNotificationReadAction]", error.message);
  refreshNotificationSurfaces();
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) console.error("[markAllNotificationsReadAction]", error.message);
  refreshNotificationSurfaces();
}

