import { createClient } from "@/lib/supabase/server";
import { resolveActiveStudentTeamContext } from "@/lib/data/student/activeTeamContext";
import type {
  BrandFileView,
  BrandOpportunityStatus,
  BrandOpportunityView,
  BrandProofStatus,
} from "@/types/brand-opportunity";

type RawFile = {
  id: string;
  file_name: string;
  object_path: string;
  mime_type: string;
  size_bytes: number;
};

async function signFiles(
  files: RawFile[]
): Promise<BrandFileView[]> {
  if (files.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("brand-opportunity-files")
    .createSignedUrls(
      files.map((file) => file.object_path),
      60 * 15
    );

  if (error) {
    console.error("[signBrandFiles]", error.message);
  }

  return files.map((file, index) => ({
    id: file.id,
    fileName: file.file_name,
    mimeType: file.mime_type,
    sizeBytes: file.size_bytes,
    signedUrl: error ? null : data?.[index]?.signedUrl ?? null,
  }));
}

export async function getBrandOpportunityForTeam(teamId: string): Promise<{
  opportunity: BrandOpportunityView | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_opportunities")
    .select(
      `
      id, team_id, title, description, instructions, scheduled_date, due_date,
      status, assigned_at,
      brand_opportunity_files (
        id, file_name, object_path, mime_type, size_bytes
      ),
      brand_work_submissions (
        id, version_number, status, notes, submitted_at, reviewed_at,
        review_comments,
        brand_work_submission_files (
          id, file_name, object_path, mime_type, size_bytes
        )
      )
    `
    )
    .eq("team_id", teamId)
    .maybeSingle();

  if (error) {
    console.error("[getBrandOpportunityForTeam]", error.message);
    return {
      opportunity: null,
      error: /brand_opportunities/i.test(error.message)
        ? "Brand Opportunity migration 016 has not been applied."
        : "The Brand Opportunity could not be loaded.",
    };
  }
  if (!data) return { opportunity: null, error: null };

  const raw = data as unknown as {
    id: string;
    team_id: string;
    title: string;
    description: string;
    instructions: string | null;
    scheduled_date: string;
    due_date: string;
    status: BrandOpportunityStatus;
    assigned_at: string | null;
    brand_opportunity_files: RawFile[] | null;
    brand_work_submissions:
      | Array<{
          id: string;
          version_number: number;
          status: BrandProofStatus;
          notes: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          review_comments: string | null;
          brand_work_submission_files: RawFile[] | null;
        }>
      | null;
  };

  const submissions = await Promise.all(
    (raw.brand_work_submissions ?? [])
      .slice()
      .sort((a, b) => b.version_number - a.version_number)
      .map(async (submission) => ({
        id: submission.id,
        versionNumber: submission.version_number,
        status: submission.status,
        notes: submission.notes,
        submittedAt: submission.submitted_at,
        reviewedAt: submission.reviewed_at,
        reviewComments: submission.review_comments,
        files: await signFiles(submission.brand_work_submission_files ?? []),
      }))
  );

  return {
    opportunity: {
      id: raw.id,
      teamId: raw.team_id,
      title: raw.title,
      description: raw.description,
      instructions: raw.instructions,
      scheduledDate: raw.scheduled_date,
      dueDate: raw.due_date,
      status: raw.status,
      assignedAt: raw.assigned_at,
      files: await signFiles(raw.brand_opportunity_files ?? []),
      submissions,
    },
    error: null,
  };
}

export async function getStudentBrandOpportunity() {
  const { context, error } = await resolveActiveStudentTeamContext();
  if (!context) {
    return { opportunity: null, teamId: null, error };
  }
  const result = await getBrandOpportunityForTeam(context.teamId);
  return { ...result, teamId: context.teamId };
}

