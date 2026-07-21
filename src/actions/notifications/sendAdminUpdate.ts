"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SendAdminUpdateState = {
  error?: string;
  success?: string;
};

function mapRpcError(message: string): string {
  const known = [
    "You do not have permission to perform this action.",
    "Select a valid update audience.",
    "Update title must be between 3 and 200 characters.",
    "Update message must be between 3 and 2000 characters.",
  ].find((entry) => message.includes(entry));
  return known ?? "The update could not be sent.";
}

export async function sendAdminUpdateAction(
  _previous: SendAdminUpdateState,
  formData: FormData
): Promise<SendAdminUpdateState> {
  const audience = formData.get("audience");
  const title = formData.get("title");
  const message = formData.get("message");

  if (
    typeof audience !== "string" ||
    !["all_students", "all_educators", "everyone"].includes(audience)
  ) {
    return { error: "Select a valid update audience." };
  }

  if (typeof title !== "string" || !title.trim()) {
    return { error: "Update title must be between 3 and 200 characters." };
  }

  if (typeof message !== "string" || !message.trim()) {
    return { error: "Update message must be between 3 and 2000 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("send_admin_update", {
    p_audience: audience,
    p_title: title.trim(),
    p_message: message.trim(),
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  revalidatePath("/admin/notifications");
  revalidatePath("/admin", "layout");
  revalidatePath("/student", "layout");
  revalidatePath("/educator", "layout");

  return { success: "Update sent." };
}
