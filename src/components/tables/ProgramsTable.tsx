import Link from "next/link";
import { StatusBadge } from "@/components/status/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminProgramRow } from "@/types/admin-records";
import { cn } from "@/lib/utils";

type ProgramsTableProps = {
  programs: AdminProgramRow[];
};

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
          <TableHead>Program / Batch</TableHead>
          <TableHead>Institutes</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>End Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {programs.map((program) => (
          <TableRow key={program.id}>
            <TableCell className="font-medium">{program.name}</TableCell>
            <TableCell>
              {program.institutes.length > 0
                ? program.institutes.join(", ")
                : "—"}
            </TableCell>
            <TableCell>{formatDate(program.startDate)}</TableCell>
            <TableCell>{formatDate(program.endDate)}</TableCell>
            <TableCell>
              <StatusBadge status={program.status} />
            </TableCell>
            <TableCell>
              <Link
                href={`/admin/programs/${program.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Manage
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
