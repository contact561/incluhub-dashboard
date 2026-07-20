"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type BrandOpportunityActionState = { error?: string; success?: string };

const BUCKET = "brand-opportunity-files";
const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg"]);

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-160) || "file";
}

function filesFrom(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function validateFiles(files: File[], label: string): string | null {
  if (files.length < 1 || files.length > MAX_FILES) {
    return `Upload between 1 and ${MAX_FILES} ${label} files.`;
  }
  if (files.some((file) => !ALLOWED_TYPES.has(file.type))) {
    return `Only PDF and JPEG ${label} files are allowed.`;
  }
  if (files.some((file) => file.size > MAX_BYTES)) {
    return `Each ${label} file must be 10 MB or smaller.`;
  }
  return null;
}

function mapError(message: string): string {
  const known = [
    "You do not have permission to perform this action.",
    "Team is not currently in Stage 4.",
    "Brand Opportunity cannot be changed after proof is submitted.",
    "Brand Opportunity is not accepting proof right now.",
    "Brand Works proof is already being prepared or reviewed.",
    "Brand Works proof is not awaiting review.",
    "Revision feedback is required.",
    "Stage 5 is not ready for final approval.",
    "Team is not currently in Stage 5.",
  ];
  return known.find((item) => message.includes(item)) ??
    (/brand_opportunit|start_brand_work|approve_stage5/i.test(message)
      ? "Migration 016 must be applied before using this workflow."
      : "The Brand Opportunity action could not be completed.");
}

function refresh(teamId: string) {
  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/admin/stages");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/my-stage");
  revalidatePath("/student/brand-opportunity");
  revalidatePath("/student/ecosystem");
  revalidatePath("/educator/my-teams");
}

async function uploadRows(args: {
  files: File[];
  basePath: string;
  ownerColumn: "opportunity_id" | "submission_id";
  ownerId: string;
  table: "brand_opportunity_files" | "brand_work_submission_files";
  profileId: string;
}) {
  const admin = createAdminClient();
  const paths: string[] = [];
  try {
    for (const file of args.files) {
      const objectPath = `${args.basePath}/${randomUUID()}-${safeName(file.name)}`;
      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(objectPath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      paths.push(objectPath);

      const common = {
        file_name: file.name.slice(0, 255),
        object_path: objectPath,
        mime_type: file.type as "application/pdf" | "image/jpeg",
        size_bytes: file.size,
        uploaded_by: args.profileId,
      };
      const rowResult =
        args.table === "brand_opportunity_files"
          ? await admin.from("brand_opportunity_files").insert({
              ...common,
              opportunity_id: args.ownerId,
            })
          : await admin.from("brand_work_submission_files").insert({
              ...common,
              submission_id: args.ownerId,
            });
      const rowError = rowResult.error;
      if (rowError) throw rowError;
    }
    return { paths, error: null };
  } catch (error) {
    if (paths.length) await admin.storage.from(BUCKET).remove(paths);
    return {
      paths: [],
      error: error instanceof Error ? error.message : "File upload failed.",
    };
  }
}

export async function assignBrandOpportunityAction(
  _previous: BrandOpportunityActionState,
  formData: FormData
): Promise<BrandOpportunityActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return { error: "You do not have permission to perform this action." };
  }
  const teamId = String(formData.get("team_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const scheduledDate = String(formData.get("scheduled_date") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const files = filesFrom(formData, "brief_files");
  const fileError = validateFiles(files, "brief");
  if (!teamId || title.length < 3 || description.length < 10) {
    return { error: "Enter a title and a clear description." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || dueDate < scheduledDate) {
    return { error: "Enter a valid scheduled date and due date." };
  }
  if (fileError) return { error: fileError };

  const supabase = await createClient();
  const { data: opportunityId, error } = await supabase.rpc("assign_brand_opportunity", {
    p_team_id: teamId,
    p_title: title,
    p_description: description,
    p_instructions: instructions || null,
    p_scheduled_date: scheduledDate,
    p_due_date: dueDate,
  });
  if (error || !opportunityId) {
    console.error("[assignBrandOpportunityAction]", error?.message);
    return { error: mapError(error?.message ?? "") };
  }

  const upload = await uploadRows({
    files,
    basePath: `opportunities/${teamId}/${opportunityId}`,
    ownerColumn: "opportunity_id",
    ownerId: opportunityId,
    table: "brand_opportunity_files",
    profileId: profile.id,
  });
  if (upload.error) {
    console.error("[assignBrandOpportunityAction] upload", upload.error);
    return { error: "The brief files could not be uploaded. Please try again." };
  }
  const { error: activateError } = await supabase.rpc("activate_brand_opportunity", {
    p_opportunity_id: opportunityId,
  });
  if (activateError) {
    console.error("[assignBrandOpportunityAction] activate", activateError.message);
    return { error: mapError(activateError.message) };
  }
  refresh(teamId);
  return { success: "Brand Opportunity assigned and shared with the team." };
}

export async function submitBrandProofAction(
  _previous: BrandOpportunityActionState,
  formData: FormData
): Promise<BrandOpportunityActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "student" || profile.status !== "active") {
    return { error: "You do not have permission to perform this action." };
  }
  const opportunityId = String(formData.get("opportunity_id") ?? "").trim();
  const teamId = String(formData.get("team_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const files = filesFrom(formData, "proof_files");
  const fileError = validateFiles(files, "proof");
  if (!opportunityId || !teamId) return { error: "Brand Opportunity was not found." };
  if (notes.length > 2000) return { error: "Notes cannot exceed 2000 characters." };
  if (fileError) return { error: fileError };

  const supabase = await createClient();
  const { data: submissionId, error } = await supabase.rpc("start_brand_work_submission", {
    p_opportunity_id: opportunityId,
    p_notes: notes || null,
  });
  if (error || !submissionId) return { error: mapError(error?.message ?? "") };

  const upload = await uploadRows({
    files,
    basePath: `proofs/${teamId}/${submissionId}`,
    ownerColumn: "submission_id",
    ownerId: submissionId,
    table: "brand_work_submission_files",
    profileId: profile.id,
  });
  if (upload.error) return { error: "The proof files could not be uploaded. Please try again." };
  const { error: finalizeError } = await supabase.rpc("finalize_brand_work_submission", {
    p_submission_id: submissionId,
  });
  if (finalizeError) return { error: mapError(finalizeError.message) };
  refresh(teamId);
  return { success: "Proof submitted for Admin review." };
}

export async function reviewBrandProofAction(
  _previous: BrandOpportunityActionState,
  formData: FormData
): Promise<BrandOpportunityActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.status !== "active") return { error: "You do not have permission to perform this action." };
  const submissionId = String(formData.get("submission_id") ?? "").trim();
  const teamId = String(formData.get("team_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const comments = String(formData.get("comments") ?? "").trim();
  if (!submissionId || !teamId || !["approved", "revision_required"].includes(decision)) return { error: "Select a valid review decision." };
  if (decision === "revision_required" && !comments) return { error: "Revision feedback is required." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_brand_work_submission", { p_submission_id: submissionId, p_decision: decision, p_comments: comments || null });
  if (error) return { error: mapError(error.message) };
  refresh(teamId);
  return { success: decision === "approved" ? "Proof approved. Stage 5 is now Under Review." : "Revision requested from the team." };
}

export async function approveStage5Action(
  _previous: BrandOpportunityActionState,
  formData: FormData
): Promise<BrandOpportunityActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || profile.status !== "active") return { error: "You do not have permission to perform this action." };
  const teamId = String(formData.get("team_id") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();
  if (!teamId || remarks.length > 2000) return { error: "Final review remarks cannot exceed 2000 characters." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_stage5_review", { p_team_id: teamId, p_remarks: remarks || null });
  if (error) return { error: mapError(error.message) };
  refresh(teamId);
  return { success: "Final review approved. Ecosystem access is now available." };
}
