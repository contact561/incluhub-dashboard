"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubmitMoodBoardState = { error?: string; success?: string };

export async function submitMoodBoardAction(
  _prev: SubmitMoodBoardState,
  formData: FormData
): Promise<SubmitMoodBoardState> {
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("mood_board_url") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (title.length < 3) {
    return { error: "Title must be at least 3 characters." };
  }
  if (url.length < 8) {
    return { error: "Provide a valid mood board URL." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_mood_board", {
    p_title: title,
    p_mood_board_url: url,
    p_notes: notes || null,
  });

  if (error) {
    const known = [
      "Mood board opens after BMS is completed for your team.",
      "Title must be at least 3 characters.",
      "Provide a valid mood board URL.",
      "Your student profile could not be found.",
      "You do not have permission to perform this action.",
    ].find((entry) => error.message.includes(entry));
    return { error: known ?? "Mood board could not be submitted." };
  }

  revalidatePath("/student/mood-board");
  revalidatePath("/student/dashboard");
  revalidatePath("/educator/dashboard");
  return { success: "Mood board submitted for review." };
}
