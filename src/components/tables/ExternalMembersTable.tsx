import { EXTERNAL_MEMBER_TYPE_LABELS } from "@/lib/constants/labels";
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
import type { AdminExternalMemberRow } from "@/types/admin-records";

type ExternalMembersTableProps = {
  members: AdminExternalMemberRow[];
};

function formatOptional(value: string | null): string {
  return value?.trim() ? value : "—";
}

export function ExternalMembersTable({ members }: ExternalMembersTableProps) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="No external members yet"
        description="External member records will appear here after admin creates their accounts."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Assigned Projects</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="font-medium">{member.name}</TableCell>
            <TableCell>{member.email}</TableCell>
            <TableCell>{formatOptional(member.phone)}</TableCell>
            <TableCell>
              {EXTERNAL_MEMBER_TYPE_LABELS[member.externalMemberType]}
            </TableCell>
            <TableCell>{member.assignedProjectsCount}</TableCell>
            <TableCell>
              <StatusBadge status={member.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
