"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import {
  ADMIN_REVISION_SUCCESS_MESSAGE,
  buildAdminApprovalSuccessMessage,
} from "@/lib/portfolio/approval-messages";
import { createClient } from "@/lib/supabase/server";
import type { AdminReviewRpcResult } from "@/types/admin-portfolio-approval";
import type { StudentCategory } from "@/types/database";

export type ReviewPortfolioAsAdminState = {
  error?: string;
  success?: string;
  workflowStatus?: string;
  nextPortfolioOutputId?: string | null;
  teamStageNumber?: number;
};

const COMMENTS_MAX = 2000;

function mapRpcError(message: string): string {
  const migrationMissing =
    /could not find the function/i.test(message) ||
    /function .*review_portfolio_admin_only.* does not exist/i.test(message);

  if (migrationMissing) {
    return "The required database migration has not been applied.";
  }

  const knownMessages = [
    "You do not have permission to perform this action.",
    "This portfolio is not awaiting Admin review.",
    "This submission does not belong to the portfolio.",
    "Only the latest portfolio submission can be reviewed.",
    "This portfolio submission has already been reviewed by Admin.",
    "Revision comments are required.",
    "Comments cannot exceed 2000 characters.",
    "The portfolio submission could not be completed.",
  ];

  const match = knownMessages.find((known) => message.includes(known));
  return match ?? "The portfolio approval could not be completed.";
}

export async function reviewPortfolioAsAdminAction(
  _prevState: ReviewPortfolioAsAdminState,
  formData: FormData
): Promise<ReviewPortfolioAsAdminState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return { error: "You do not have permission to perform this action." };
  }

  const portfolioOutputId = formData.get("portfolio_output_id");
  const submissionId = formData.get("submission_id");
  const sequenceOrderRaw = formData.get("sequence_order");
  const portfolioTypeRaw = formData.get("portfolio_type");
  const teamIdRaw = formData.get("team_id");
  const decisionRaw = formData.get("decision");
  const commentsRaw = formData.get("comments");

  if (
    typeof portfolioOutputId !== "string" ||
    !portfolioOutputId.trim() ||
    typeof submissionId !== "string" ||
    !submissionId.trim()
  ) {
    return { error: "The portfolio approval could not be completed." };
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

  const { data, error } = await supabase.rpc("review_portfolio_admin_only", {
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
    return { error: "The portfolio approval could not be completed." };
  }

  const result = row as AdminReviewRpcResult;
  const sequenceOrder =
    typeof sequenceOrderRaw === "string" && sequenceOrderRaw !== ""
      ? Number(sequenceOrderRaw)
      : null;
  const portfolioType =
    typeof portfolioTypeRaw === "string"
      ? (portfolioTypeRaw as StudentCategory)
      : null;
  const teamId = typeof teamIdRaw === "string" ? teamIdRaw.trim() : "";

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/portfolio-approvals");
  revalidatePath(`/admin/portfolio-approvals/${portfolioOutputId.trim()}`);
  revalidatePath("/admin/stages");
  if (teamId) {
    revalidatePath(`/admin/teams/${teamId}`);
  }

  if (decisionRaw === "revision_required") {
    return {
      success: ADMIN_REVISION_SUCCESS_MESSAGE,
      workflowStatus: result.workflow_status,
    };
  }

  const successMessage =
    portfolioType && sequenceOrder !== null && !Number.isNaN(sequenceOrder)
      ? buildAdminApprovalSuccessMessage(portfolioType, sequenceOrder)
      : "Portfolio approved successfully.";

  return {
    success: successMessage,
    workflowStatus: result.workflow_status,
    nextPortfolioOutputId: result.next_portfolio_output_id,
    teamStageNumber: result.team_stage_number,
  };
}
