import Link from "next/link";
import { CreateProgramForm } from "@/components/forms/CreateProgramForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { getActiveInstituteOptions } from "@/lib/data/admin/institutes";
import { cn } from "@/lib/utils";

export default async function AdminCreateProgramPage() {
  const institutes = await getActiveInstituteOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Program"
        description="Create a Program / Batch and select one or more participating institutes."
        secondaryActions={
          <Link
            href="/admin/programs"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Programs
          </Link>
        }
      />
      <div className="max-w-2xl rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
        <CreateProgramForm institutes={institutes} />
      </div>
    </div>
  );
}
