import { redirect } from "next/navigation";
import { EcosystemCelebration } from "@/components/student/EcosystemCelebration";
import { QueryErrorState } from "@/components/status";
import { getEcosystemConfig } from "@/lib/config/ecosystem";
import { getStudentEcosystemAccess } from "@/lib/data/student/ecosystem";

export default async function StudentEcosystemPage() {
  const access = await getStudentEcosystemAccess();

  if (access.status === "locked") {
    redirect("/student/my-stage?ecosystem=locked");
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
