import Link from "next/link";
import { CreateUserForm } from "@/components/forms/CreateUserForm";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

async function getInstituteOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institutes")
    .select("id, name")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    console.error("[AdminCreateUserPage] institutes", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
  }));
}

export default async function AdminCreateUserPage() {
  const institutes = await getInstituteOptions();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Create User"
        description="Create a login account and matching profile / role records."
        actions={
          <Link
            href="/admin/users"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Users
          </Link>
        }
      />
      <div className="p-6">
        <CreateUserForm institutes={institutes} />
      </div>
    </div>
  );
}
