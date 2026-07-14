"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReviewPortfolioAsEducatorState = {
  error?: string;
  success?: string;
  workflowStatus?: string;
};

const COMMENTS_MAX = 2000;

function mapRpcError(message: string): string {
  const migrationMissing =
    /could not find the function/i.test(message) ||
    /function .*review_portfolio_as_educator.* does not exist/i.test(message);

  if (migrationMissing) {
    return "The required database migration has not been applied.";
  }

  const knownMessages = [
    "You do not have permission to perform this action.",
    "Your educator profile could not be found.",
    "You are not the matching educator for this portfolio.",
    "This portfolio is not awaiting educator review.",
    "This submission does not belong to the portfolio.",
    "Only the latest portfolio submission can be reviewed.",
    "This portfolio submission has already been reviewed by an educator.",
    "Revision comments are required.",
    "Comments cannot exceed 2000 characters.",
  ];

  const match = knownMessages.find((known) => message.includes(known));
  return match ?? "The portfolio review could not be completed.";
}

export async function reviewPortfolioAsEducatorAction(
  _prevState: ReviewPortfolioAsEducatorState,
  formData: FormData
): Promise<ReviewPortfolioAsEducatorState> {
  const portfolioOutputId = formData.get("portfolio_output_id");
  const submissionId = formData.get("submission_id");
  const decisionRaw = formData.get("decision");
  const commentsRaw = formData.get("comments");

  if (
    typeof portfolioOutputId !== "string" ||
    !portfolioOutputId.trim() ||
    typeof submissionId !== "string" ||
    !submissionId.trim()
  ) {
    return { error: "The portfolio review could not be completed." };
  }

  if (
    typeof decisionRaw !== "string" ||
    (decisionRaw !== "approved" && decisionRaw !== "revision_required")
  ) {
    return { error: "Choose Approve or Request revision." };
  }

  const comments =
    typeof commentsRaw === "string" ? commentsRaw.trim() : "";

  if (decisionRaw === "revision_required") {
    if (!comments) {
      return { error: "Revision comments are required." };
    }
    if (comments.length > COMMENTS_MAX) {
      return { error: "Comments cannot exceed 2000 characters." };
    }
  }

  if (comments.length > COMMENTS_MAX) {
    return { error: "Comments cannot exceed 2000 characters." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("review_portfolio_as_educator", {
    p_portfolio_output_id: portfolioOutputId.trim(),
    p_submission_id: submissionId.trim(),
    p_decision: decisionRaw,
    p_comments: comments === "" ? null : comments,
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return { error: "The portfolio review could not be completed." };
  }

  const result = row as { workflow_status: string };

  revalidatePath("/educator/dashboard");
  revalidatePath("/educator/my-teams");
  revalidatePath("/educator/my-students");
  revalidatePath("/educator/portfolio-reviews");
  revalidatePath(`/educator/portfolio-reviews/${portfolioOutputId.trim()}`);

  if (decisionRaw === "approved") {
    return {
      success: "Portfolio approved. It is now waiting for Admin review.",
      workflowStatus: result.workflow_status,
    };
  }

  return {
    success: "Revision requested. The portfolio leader can resubmit.",
    workflowStatus: result.workflow_status,
  };
}
