import { redirect } from "next/navigation";
import { EcosystemCelebration } from "@/components/student/EcosystemCelebration";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryErrorState, StatusPanel } from "@/components/status";
import { getEcosystemConfig } from "@/lib/config/ecosystem";
import { getStudentEcosystemAccess } from "@/lib/data/student/ecosystem";

export default async function StudentEcosystemPage() {
  const access = await getStudentEcosystemAccess();

  if (access.status === "locked") {
    redirect("/student/my-stage?ecosystem=locked");
  }

  if (access.status === "pending_review") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ecosystem"
          description="Final review before selected candidates receive access."
        />
        <StatusPanel
          variant="information"
          title="Your portfolio and sessions are under review"
          description="Reaching Stage 5 does not automatically unlock the ecosystem. IncluHub Admin will notify you if and when you are selected. No action is required from you right now."
        />
      </div>
    );
  }

  if (access.status === "error") {
    return (
      <QueryErrorState
        title="Ecosystem access unavailable"
        message={access.message}
      />
    );
  }

  return (
    <EcosystemCelebration
      studentName={access.studentName}
      teamName={access.teamName}
      programName={access.programName}
      config={getEcosystemConfig()}
    />
  );
}
