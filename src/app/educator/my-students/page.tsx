import { AssignedStudentTable } from "@/components/educator/AssignedStudentTable";
import { EmptyState, QueryErrorState } from "@/components/status";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { getEducatorAssignedStudents } from "@/lib/data/educator/students";

export default async function EducatorMyStudentsPage() {
  const { students, error } = await getEducatorAssignedStudents();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="My Students"
        description="Students explicitly mapped to you through team educator assignments."
        count={error ? undefined : students.length}
      />
      <div className="space-y-4 p-6">
        {error ? <QueryErrorState message={error} /> : null}

        {!error && students.length === 0 ? (
          <EmptyState
            title="No assigned students"
            description="You do not currently have any active student mappings."
          />
        ) : null}

        {!error && students.length > 0 ? (
          <AssignedStudentTable students={students} />
        ) : null}
      </div>
    </div>
  );
}
