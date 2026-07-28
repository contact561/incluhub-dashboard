"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MoodboardActionState = {
  error?: string;
  success?: string;
};

function validateDriveUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "drive.google.com";
  } catch {
    return false;
  }
}

export async function submitMoodboardAction(
  _previous: MoodboardActionState,
  formData: FormData
): Promise<MoodboardActionState> {
  const portfolioOutputId = formData.get("portfolio_output_id");
  const title = formData.get("title");
  const moodboardUrl = formData.get("moodboard_url");
  const notes = formData.get("notes");
  const linkTested = formData.get("link_tested");

  if (
    typeof portfolioOutputId !== "string" ||
    typeof title !== "string" ||
    title.trim().length < 3 ||
    title.trim().length > 150
  ) {
    return { error: "Moodboard title must be between 3 and 150 characters." };
  }
  if (
    typeof moodboardUrl !== "string" ||
    !validateDriveUrl(moodboardUrl.trim())
  ) {
    return {
      error: "Use a Google Drive link beginning with https://drive.google.com/.",
    };
  }
  if (linkTested !== "yes") {
    return {
      error: "Confirm that you tested the Google Drive link in a private window.",
    };
  }

  const cleanNotes = typeof notes === "string" ? notes.trim() : "";
  if (cleanNotes.length > 2000) {
    return { error: "Notes cannot exceed 2000 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_moodboard", {
    p_portfolio_output_id: portfolioOutputId,
    p_title: title.trim(),
    p_moodboard_url: moodboardUrl.trim(),
    p_notes: cleanNotes || null,
  });

  if (error) {
    const known = [
      "You do not have permission to perform this action.",
      "Only the current portfolio leader can submit this moodboard.",
      "This moodboard is not open for submission.",
      "This moodboard is already awaiting review or approved.",
      "The team is not currently in Stage 3.",
    ].find((message) => error.message.includes(message));
    return {
      error:
        known ??
        (/submit_moodboard/i.test(error.message)
          ? "The moodboard database migration has not been applied."
          : "The moodboard could not be submitted."),
    };
  }

  revalidatePath("/student/portfolio");
  revalidatePath("/admin/moodboards");
  revalidatePath("/educator/portfolio-reviews");
  return {
    success: "Moodboard submitted. IncluHub Admin will approve it or request a revision.",
  };
}

export async function reviewMoodboardAsAdminAction(
  _previous: MoodboardActionState,
  formData: FormData
): Promise<MoodboardActionState> {
  const submissionId = formData.get("moodboard_submission_id");
  const decision = formData.get("decision");
  const comments = formData.get("comments");

  if (
    typeof submissionId !== "string" ||
    typeof decision !== "string" ||
    !["approved", "revision_required"].includes(decision)
  ) {
    return { error: "Select approve or request revision." };
  }
  const cleanComments = typeof comments === "string" ? comments.trim() : "";
  if (decision === "revision_required" && !cleanComments) {
    return { error: "Revision comments are required." };
  }
  if (cleanComments.length > 2000) {
    return { error: "Comments cannot exceed 2000 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_moodboard_as_admin", {
    p_moodboard_submission_id: submissionId,
    p_decision: decision,
    p_comments: cleanComments || null,
  });
  if (error) {
    return {
      error: /review_moodboard_as_admin/i.test(error.message)
        ? "The moodboard database migration has not been applied."
        : error.message,
    };
  }

  revalidatePath("/admin/moodboards");
  revalidatePath("/student/portfolio");
  revalidatePath("/educator/portfolio-reviews");
  return {
    success:
      decision === "approved"
        ? "Moodboard approved. Studio booking is now available."
        : "Revision requested and the team has been notified.",
  };
}
