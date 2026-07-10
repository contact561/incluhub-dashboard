import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { EmptyState } from "@/components/status/EmptyState";
import { StatusBadge } from "@/components/status/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminStudentRow } from "@/types/admin-records";

type StudentsTableProps = {
  students: AdminStudentRow[];
};

function formatOptional(value: string | null): string {
  return value?.trim() ? value : "—";
}

export function StudentsTable({ students }: StudentsTableProps) {
  if (students.length === 0) {
    return (
      <EmptyState
        title="No students yet"
        description="Student records will appear here after admin creates student accounts."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Institute</TableHead>
          <TableHead>Current Team</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => (
          <TableRow key={student.id}>
            <TableCell className="font-medium">{student.name}</TableCell>
            <TableCell>{student.email}</TableCell>
            <TableCell>{formatOptional(student.phone)}</TableCell>
            <TableCell>
              {STUDENT_CATEGORY_LABELS[student.studentCategory]}
            </TableCell>
            <TableCell>{formatOptional(student.institute)}</TableCell>
            <TableCell>{formatOptional(student.currentTeam)}</TableCell>
            <TableCell>Stage {student.currentStageNumber}</TableCell>
            <TableCell>
              <StatusBadge status={student.paymentStatus} />
            </TableCell>
            <TableCell>
              <StatusBadge status={student.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
