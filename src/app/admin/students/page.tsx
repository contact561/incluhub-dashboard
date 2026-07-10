import { getAdminStudents } from "@/lib/data/admin/students";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { StudentsTable } from "@/components/tables/StudentsTable";

export default async function AdminStudentsPage() {
  const students = await getAdminStudents();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Students"
        description="View student profiles, categories, team assignments, and stage progress."
        count={students.length}
      />
      <div className="p-6">
        <StudentsTable students={students} />
      </div>
    </div>
  );
}
