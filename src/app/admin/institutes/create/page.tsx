import Link from "next/link";
import { CreateInstituteForm } from "@/components/forms/CreateInstituteForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminCreateInstitutePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Institute"
        description="Add an academy or institute that students and educators can belong to."
        secondaryActions={
          <Link
            href="/admin/institutes"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Institutes
          </Link>
        }
      />
      <div className="max-w-2xl rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
        <CreateInstituteForm />
      </div>
    </div>
  );
}
