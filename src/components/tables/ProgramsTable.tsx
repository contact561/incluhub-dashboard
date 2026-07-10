import { StatusBadge } from "@/components/status/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminProgramRow } from "@/types/admin-records";

type ProgramsTableProps = {
  programs: AdminProgramRow[];
};

function formatOptional(value: string | null): string {
  return value?.trim() ? value : "—";
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function ProgramsTable({ programs }: ProgramsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Program</TableHead>
          <TableHead>Institute</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>End Date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {programs.map((program) => (
          <TableRow key={program.id}>
            <TableCell className="font-medium">{program.name}</TableCell>
            <TableCell>{formatOptional(program.institute)}</TableCell>
            <TableCell>{formatDate(program.startDate)}</TableCell>
            <TableCell>{formatDate(program.endDate)}</TableCell>
            <TableCell>
              <StatusBadge status={program.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
