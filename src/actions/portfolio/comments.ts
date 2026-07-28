"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type WorkflowCommentState = { error?: string; success?: string };

export async function addEducatorWorkflowCommentAction(
  _previous: WorkflowCommentState,
  formData: FormData
): Promise<WorkflowCommentState> {
  const teamId = formData.get("team_id");
  const portfolioOutputId = formData.get("portfolio_output_id");
  const moodboardSubmissionId = formData.get("moodboard_submission_id");
  const portfolioSubmissionId = formData.get("portfolio_submission_id");
  const body = formData.get("body");

  if (typeof teamId !== "string" || typeof body !== "string") {
    return { error: "The comment could not be added." };
  }
  const cleanBody = body.trim();
  if (!cleanBody || cleanBody.length > 2000) {
    return { error: "Comment must be between 1 and 2000 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_educator_workflow_comment", {
    p_team_id: teamId,
    p_portfolio_output_id:
      typeof portfolioOutputId === "string" && portfolioOutputId
        ? portfolioOutputId
        : null,
    p_moodboard_submission_id:
      typeof moodboardSubmissionId === "string" && moodboardSubmissionId
        ? moodboardSubmissionId
        : null,
    p_portfolio_submission_id:
      typeof portfolioSubmissionId === "string" && portfolioSubmissionId
        ? portfolioSubmissionId
        : null,
    p_body: cleanBody,
  });

  if (error) {
    return {
      error: /add_educator_workflow_comment/i.test(error.message)
        ? "The educator comments migration has not been applied."
        : error.message,
    };
  }

  revalidatePath("/educator/portfolio-reviews");
  revalidatePath(`/educator/portfolio-reviews/${portfolioOutputId}`);
  revalidatePath("/student/portfolio");
  revalidatePath("/admin/portfolio-approvals");
  return { success: "Comment posted for the team and Admin to see." };
}
