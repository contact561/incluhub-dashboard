import Link from "next/link";
import { CreateInstituteForm } from "@/components/forms/CreateInstituteForm";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminCreateInstitutePage() {
  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Create Institute"
        description="Add an academy or institute that students and educators can belong to."
        actions={
          <Link
            href="/admin/institutes"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Institutes
          </Link>
        }
      />
      <div className="p-6">
        <CreateInstituteForm />
      </div>
    </div>
  );
}
