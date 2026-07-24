"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReviewMoodBoardState = { error?: string; success?: string };

export async function reviewMoodBoardAction(
  _prev: ReviewMoodBoardState,
  formData: FormData
): Promise<ReviewMoodBoardState> {
  const submissionId = String(formData.get("submission_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const comments = String(formData.get("comments") ?? "").trim();

  if (!submissionId) {
    return { error: "Submission is required." };
  }
  if (decision !== "approved" && decision !== "revision_required") {
    return { error: "Select approve or revision required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_mood_board", {
    p_submission_id: submissionId,
    p_decision: decision,
    p_comments: comments || null,
  });

  if (error) {
    const known = [
      "Mood board submission was not found.",
      "Select approve or revision required.",
      "Revision comments are required.",
      "You do not have permission to perform this action.",
    ].find((entry) => error.message.includes(entry));
    return { error: known ?? "Review could not be saved." };
  }

  revalidatePath("/educator/dashboard");
  revalidatePath("/admin/teams");
  revalidatePath("/student/mood-board");
  return { success: "Review saved." };
}
