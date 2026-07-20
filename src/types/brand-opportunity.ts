export type BrandOpportunityStatus =
  | "draft"
  | "assigned"
  | "proof_submitted"
  | "revision_required"
  | "approved";

export type BrandProofStatus =
  | "draft"
  | "submitted"
  | "revision_required"
  | "approved";

export type BrandFileView = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  signedUrl: string | null;
};

export type BrandProofView = {
  id: string;
  versionNumber: number;
  status: BrandProofStatus;
  notes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewComments: string | null;
  files: BrandFileView[];
};

export type BrandOpportunityView = {
  id: string;
  teamId: string;
  title: string;
  description: string;
  instructions: string | null;
  scheduledDate: string;
  dueDate: string;
  status: BrandOpportunityStatus;
  assignedAt: string | null;
  files: BrandFileView[];
  submissions: BrandProofView[];
};

