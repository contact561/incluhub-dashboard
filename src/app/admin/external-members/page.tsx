import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAdminExternalMembers } from "@/lib/data/admin/external-members";
import { ExternalMembersTable } from "@/components/tables/ExternalMembersTable";

export default async function AdminExternalMembersPage() {
  const members = await getAdminExternalMembers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="External Members"
        description="View models, mentors, and other collaborators assigned to projects."
        metadata={
          <span>
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        }
      />

      <DataTable>
        <div className="p-2">
          <ExternalMembersTable members={members} />
        </div>
      </DataTable>
    </div>
  );
}
