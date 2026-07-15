import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAdminEducators } from "@/lib/data/admin/educators";
import { EducatorsTable } from "@/components/tables/EducatorsTable";

export default async function AdminEducatorsPage() {
  const educators = await getAdminEducators();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Educators"
        description="View educator profiles, types, institute links, and team assignments."
        metadata={
          <span>
            {educators.length}{" "}
            {educators.length === 1 ? "educator" : "educators"}
          </span>
        }
      />

      <DataTable>
        <div className="p-2">
          <EducatorsTable educators={educators} />
        </div>
      </DataTable>
    </div>
  );
}
