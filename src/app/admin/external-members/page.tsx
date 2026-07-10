import { getAdminExternalMembers } from "@/lib/data/admin/external-members";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { ExternalMembersTable } from "@/components/tables/ExternalMembersTable";

export default async function AdminExternalMembersPage() {
  const members = await getAdminExternalMembers();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="External Members"
        description="View models, mentors, and other collaborators assigned to projects."
        count={members.length}
      />
      <div className="p-6">
        <ExternalMembersTable members={members} />
      </div>
    </div>
  );
}
