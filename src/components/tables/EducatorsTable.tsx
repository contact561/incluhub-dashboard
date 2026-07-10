import { EDUCATOR_TYPE_LABELS } from "@/lib/constants/labels";
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
import type { AdminEducatorRow } from "@/types/admin-records";

type EducatorsTableProps = {
  educators: AdminEducatorRow[];
};

function formatOptional(value: string | null): string {
  return value?.trim() ? value : "—";
}

export function EducatorsTable({ educators }: EducatorsTableProps) {
  if (educators.length === 0) {
    return (
      <EmptyState
        title="No educators yet"
        description="Educator records will appear here after admin creates educator accounts."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Educator Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Institute</TableHead>
          <TableHead>Assigned Teams</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {educators.map((educator) => (
          <TableRow key={educator.id}>
            <TableCell className="font-medium">{educator.name}</TableCell>
            <TableCell>{educator.email}</TableCell>
            <TableCell>{formatOptional(educator.phone)}</TableCell>
            <TableCell>{EDUCATOR_TYPE_LABELS[educator.educatorType]}</TableCell>
            <TableCell>{formatOptional(educator.institute)}</TableCell>
            <TableCell>{educator.assignedTeamsCount}</TableCell>
            <TableCell>
              <StatusBadge status={educator.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
