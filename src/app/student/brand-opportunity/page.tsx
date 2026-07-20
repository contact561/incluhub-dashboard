import { BrandOpportunityStudentPanel } from "@/components/stages/BrandOpportunityStudentPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryErrorState, StatusPanel } from "@/components/status";
import { WhatHappensNow } from "@/components/student/WhatHappensNow";
import { getStudentBrandOpportunity } from "@/lib/data/brand-opportunity";

export default async function StudentBrandOpportunityPage() {
  const { opportunity, teamId, error } = await getStudentBrandOpportunity();
  return <div className="space-y-6">
    <PageHeader title="Brand Opportunity" description="Review your assigned Stage 4 brief and submit mandatory proof of work." />
    {error ? <QueryErrorState message={error} /> : null}
    {!error && (!opportunity || opportunity.status === "draft") ? <StatusPanel variant="information" title="Assignment pending" description="A Brand Opportunity is being assigned to your team. No action is required yet." /> : null}
    {!error && opportunity && teamId && opportunity.status !== "draft" ? <BrandOpportunityStudentPanel opportunity={opportunity} teamId={teamId} /> : null}
    <WhatHappensNow title={opportunity?.status === "revision_required" ? "Respond to Admin feedback" : opportunity?.status === "proof_submitted" ? "Wait for Admin review" : opportunity?.status === "approved" ? "Follow the final review" : opportunity ? "Complete the assigned brief" : "Wait for the assignment"} description={opportunity?.status === "revision_required" ? "Read the feedback, prepare corrected proof, and submit a new version." : opportunity?.status === "proof_submitted" ? "Admin will approve the proof or request a revision. You will receive an in-app notification." : opportunity?.status === "approved" ? "Stage 5 remains Under Review until Admin separately approves ecosystem access." : opportunity ? "Download every brief file, follow the instructions, and upload 1–5 proof files by the due date." : "IncluHub Admin is preparing the title, instructions, dates, and secure brief files."} />
  </div>;
}

