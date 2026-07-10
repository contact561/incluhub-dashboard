import { getAdminEducators } from "@/lib/data/admin/educators";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { EducatorsTable } from "@/components/tables/EducatorsTable";

export default async function AdminEducatorsPage() {
  const educators = await getAdminEducators();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Educators"
        description="View educator profiles, types, institute links, and team assignments."
        count={educators.length}
      />
      <div className="p-6">
        <EducatorsTable educators={educators} />
      </div>
    </div>
  );
}
