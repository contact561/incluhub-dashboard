import { StatusBadge } from "@/components/status/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminInstituteRow } from "@/types/admin-records";

type InstitutesTableProps = {
  institutes: AdminInstituteRow[];
};

function formatOptional(value: string | null): string {
  return value?.trim() ? value : "—";
}

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function InstitutesTable({ institutes }: InstitutesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {institutes.map((institute) => (
          <TableRow key={institute.id}>
            <TableCell className="font-medium">{institute.name}</TableCell>
            <TableCell>{formatOptional(institute.email)}</TableCell>
            <TableCell>{formatOptional(institute.phone)}</TableCell>
            <TableCell>
              <StatusBadge status={institute.status} />
            </TableCell>
            <TableCell>{formatCreatedAt(institute.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
