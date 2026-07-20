"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioWorkflowStatus } from "@/types/database";

export type ResubmitPortfolioState = {
  error?: string;
  success?: string;
  submission?: {
    versionNumber: number;
    title: string;
    portfolioUrl: string;
    notes: string | null;
    submittedAt: string;
    workflowStatus: PortfolioWorkflowStatus;
  };
};

const TITLE_MIN = 3;
const TITLE_MAX = 150;
const NOTES_MAX = 2000;

const GENERIC_ERROR = "The portfolio resubmission could not be completed.";

function mapRpcError(message: string): string {
  const migrationMissing =
    /could not find the function/i.test(message) ||
    /function .*resubmit_portfolio.* does not exist/i.test(message);

  if (migrationMissing) {
    return "The required database migration has not been applied.";
  }

  const knownMessages = [
    "You do not have permission to perform this action.",
    "Your student profile could not be found.",
    "You are not part of this team.",
    "You are not the current portfolio leader.",
    "This portfolio is not awaiting revision.",
    "Portfolio title is required.",
    "Portfolio title must be between 3 and 150 characters.",
    "Enter a valid HTTP or HTTPS portfolio link.",
    "Use a Google Drive link beginning with https://drive.google.com/.",
    "Notes cannot exceed 2000 characters.",
    "This portfolio has already been submitted.",
  ];

  const match = knownMessages.find((known) => message.includes(known));
  return match ?? GENERIC_ERROR;
}

function validateClientInput(
  title: string,
  portfolioUrl: string,
  notes: string
): string | null {
  const trimmedTitle = title.trim();
  const trimmedUrl = portfolioUrl.trim();
  const trimmedNotes = notes.trim();

  if (!trimmedTitle) {
    return "Portfolio title is required.";
  }

  if (trimmedTitle.length < TITLE_MIN || trimmedTitle.length > TITLE_MAX) {
    return "Portfolio title must be between 3 and 150 characters.";
  }

  if (!trimmedUrl) {
    return "Enter a valid HTTP or HTTPS portfolio link.";
  }

  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== "drive.google.com") {
      return "Use a Google Drive link beginning with https://drive.google.com/.";
    }
  } catch {
    return "Use a valid Google Drive link.";
  }

  if (trimmedNotes.length > NOTES_MAX) {
    return "Notes cannot exceed 2000 characters.";
  }

  return null;
}

function successMessage(
  workflowStatus: string,
  versionNumber: number
): string {
  if (workflowStatus === "pending_admin") {
    return `Version ${versionNumber} submitted. Your revised portfolio has returned directly to Admin review.`;
  }

  return `Version ${versionNumber} submitted. Your portfolio has returned to the Educator for review.`;
}

export async function resubmitPortfolioAction(
  _prevState: ResubmitPortfolioState,
  formData: FormData
): Promise<ResubmitPortfolioState> {
  const portfolioOutputId = formData.get("portfolio_output_id");
  const titleRaw = formData.get("title");
  const urlRaw = formData.get("portfolio_url");
  const notesRaw = formData.get("notes");
  const linkTested = formData.get("link_tested");

  if (typeof portfolioOutputId !== "string" || !portfolioOutputId.trim()) {
    return { error: GENERIC_ERROR };
  }

  if (typeof titleRaw !== "string") {
    return { error: "Portfolio title is required." };
  }

  if (typeof urlRaw !== "string") {
    return { error: "Enter a valid HTTP or HTTPS portfolio link." };
  }

  const notes = typeof notesRaw === "string" ? notesRaw : "";

  const clientError = validateClientInput(titleRaw, urlRaw, notes);
  if (clientError) {
    return { error: clientError };
  }
  if (linkTested !== "yes") {
    return { error: "Confirm that you tested the Google Drive link in a private window." };
  }

  const supabase = await createClient();

  // The RPC is the sole mutation authority: it enforces leader ownership,
  // revision_required state, immutable versioning and reviewer routing.
  const { data, error } = await supabase.rpc("resubmit_portfolio", {
    p_portfolio_output_id: portfolioOutputId,
    p_title: titleRaw.trim(),
    p_portfolio_url: urlRaw.trim(),
    p_notes: notes.trim() === "" ? null : notes.trim(),
  });

  if (error) {
    return { error: mapRpcError(error.message) };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return { error: GENERIC_ERROR };
  }

  const submission = row as {
    submission_id: string;
    version_number: number;
    title: string;
    portfolio_url: string;
    notes: string | null;
    submitted_at: string;
    workflow_status: string;
  };

  revalidatePath("/student/portfolio");
  revalidatePath("/student/my-stage");
  revalidatePath("/student/dashboard");
  revalidatePath("/educator/portfolio-reviews");
  revalidatePath("/educator/dashboard");
  revalidatePath("/admin/portfolio-approvals");
  revalidatePath("/admin/dashboard");

  return {
    success: successMessage(
      submission.workflow_status,
      submission.version_number
    ),
    submission: {
      versionNumber: submission.version_number,
      title: submission.title,
      portfolioUrl: submission.portfolio_url,
      notes: submission.notes,
      submittedAt: submission.submitted_at,
      workflowStatus: submission.workflow_status as PortfolioWorkflowStatus,
    },
  };
}
