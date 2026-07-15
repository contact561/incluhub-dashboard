import { AssignedStudentTable } from "@/components/educator/AssignedStudentTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { getEducatorAssignedStudents } from "@/lib/data/educator/students";

export default async function EducatorMyStudentsPage() {
  const { students, error } = await getEducatorAssignedStudents();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Students"
        description="Students explicitly mapped to you through team educator assignments."
        metadata={
          error ? undefined : (
            <span>
              {students.length}{" "}
              {students.length === 1 ? "student" : "students"}
            </span>
          )
        }
      />

      {error ? (
        <QueryErrorState
          title="Could not load students"
          message={error}
        />
      ) : null}

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
  );
}
