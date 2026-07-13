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
import type { AdminTeamRow } from "@/types/admin-records";
import { cn } from "@/lib/utils";

type TeamsTableProps = {
  teams: AdminTeamRow[];
};

function formatMember(fullName: string | null, institute: string | null): string {
  if (!fullName) {
    return "—";
  }
  return institute ? `${fullName} (${institute})` : fullName;
}

export function TeamsTable({ teams }: TeamsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Team Name</TableHead>
          <TableHead>Program / Batch</TableHead>
          <TableHead>Makeup Artist</TableHead>
          <TableHead>Photographer</TableHead>
          <TableHead>Hairstylist</TableHead>
          <TableHead>Current Stage</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teams.map((team) => (
          <TableRow key={team.id}>
            <TableCell className="font-medium">{team.teamName}</TableCell>
            <TableCell>{team.program ?? "—"}</TableCell>
            <TableCell>
              {formatMember(
                team.makeupArtist.fullName,
                team.makeupArtist.institute
              )}
            </TableCell>
            <TableCell>
              {formatMember(
                team.photographer.fullName,
                team.photographer.institute
              )}
            </TableCell>
            <TableCell>
              {formatMember(
                team.hairstylist.fullName,
                team.hairstylist.institute
              )}
            </TableCell>
            <TableCell>
              {team.currentStageNumber === null
                ? "Not enrolled"
                : `Stage ${team.currentStageNumber}`}
            </TableCell>
            <TableCell>
              <StatusBadge status={team.status} />
            </TableCell>
            <TableCell>
              <Link
                href={`/admin/teams/${team.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
