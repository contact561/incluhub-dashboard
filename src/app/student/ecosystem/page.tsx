import { redirect } from "next/navigation";
import { EcosystemCelebration } from "@/components/student/EcosystemCelebration";
import { QueryErrorState } from "@/components/status";
import { getEcosystemConfig } from "@/lib/config/ecosystem";
import { getStudentEcosystemAccess } from "@/lib/data/student/ecosystem";
import Image from "next/image";
import { WhatHappensNow } from "@/components/student/WhatHappensNow";

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

  const config = getEcosystemConfig();

  if (access.status === "under_review") {
    return (
      <div className="space-y-6">
        <section className="flex min-h-[60dvh] flex-col items-center justify-center rounded-[var(--radius-card)] border border-border-default bg-surface-card p-6 text-center">
          <Image
            src={config.logoPath}
            alt={`${config.appName} logo`}
            width={128}
            height={128}
            className="size-28 object-contain"
            priority
            unoptimized
          />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Stage 5</p>
          <h1 className="mt-2 text-3xl font-semibold text-text-primary">Under Review</h1>
          <p className="mt-3 max-w-xl text-pretty text-text-muted">
            Your Brand Opportunity proof is approved. IncluHub Admin is completing the final review before ecosystem access is released. No action is required from you right now.
          </p>
        </section>
        <WhatHappensNow
          title="Wait for final Admin approval"
          description="You will receive an in-app notification when the review is complete. The ecosystem button will appear here after approval."
          actionLabel="View notifications"
          actionHref="/student/notifications"
        />
      </div>
    );
  }

  return (
    <EcosystemCelebration
      studentName={access.studentName}
      teamName={access.teamName}
      programName={access.programName}
      config={config}
    />
  );
}
