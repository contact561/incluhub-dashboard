import Link from "next/link";
import { CreateProgramForm } from "@/components/forms/CreateProgramForm";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { getActiveInstituteOptions } from "@/lib/data/admin/institutes";
import { cn } from "@/lib/utils";

export default async function AdminCreateProgramPage() {
  const institutes = await getActiveInstituteOptions();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Create Program"
        description="Create a program and link it to an existing institute."
        actions={
          <Link
            href="/admin/programs"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Programs
          </Link>
        }
      />
      <div className="p-6">
        <CreateProgramForm institutes={institutes} />
      </div>
    </div>
  );
}
