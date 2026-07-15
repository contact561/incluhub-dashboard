import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAdminStudents } from "@/lib/data/admin/students";
import { StudentsTable } from "@/components/tables/StudentsTable";

export default async function AdminStudentsPage() {
  const students = await getAdminStudents();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="View student profiles, categories, team assignments, and stage progress."
        metadata={
          <span>
            {students.length}{" "}
            {students.length === 1 ? "student" : "students"}
          </span>
        }
      />

      <DataTable>
        <div className="p-2">
          <StudentsTable students={students} />
        </div>
      </DataTable>
    </div>
  );
}
