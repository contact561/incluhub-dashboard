"use client";

import { useActionState, useMemo, useState } from "react";
import {
  assignTeamMemberSlotAction,
  deassignTeamMemberAction,
  type TeamMembershipState,
} from "@/actions/teams/deassignTeamMember";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  EDUCATOR_TYPE_LABELS,
  STUDENT_CATEGORY_LABELS,
} from "@/lib/constants/labels";
import { TEAM_STUDENT_CATEGORIES } from "@/lib/validations/user";
import type {
  TeamCreateEducatorOption,
  TeamCreateStudentOption,
} from "@/types/admin-records";
import type { StudentCategory } from "@/types/database";
import { cn } from "@/lib/utils";

type OccupiedMember = {
  studentId: string;
  fullName: string;
  category: StudentCategory;
};

type TeamMembershipPanelProps = {
  teamId: string;
  programId: string;
  occupied: OccupiedMember[];
  availableStudents: TeamCreateStudentOption[];
  educators: TeamCreateEducatorOption[];
};

const selectClassName = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
);

const categoryToEducatorType = {
  makeup_artist: "makeup_educator",
  photographer: "photography_educator",
  hairstylist: "hairstyling_educator",
} as const;

export function TeamMembershipPanel({
  teamId,
  programId,
  occupied,
  availableStudents,
  educators,
}: TeamMembershipPanelProps) {
  const [deassignState, deassignAction, deassignPending] = useActionState<
    TeamMembershipState,
    FormData
  >(deassignTeamMemberAction, {});
  const [assignState, assignAction, assignPending] = useActionState<
    TeamMembershipState,
    FormData
  >(assignTeamMemberSlotAction, {});

  const occupiedCategories = useMemo(
    () => new Set(occupied.map((member) => member.category)),
    [occupied]
  );

  const openCategories = TEAM_STUDENT_CATEGORIES.filter(
    (category) => !occupiedCategories.has(category)
  );

  const [openCategory, setOpenCategory] = useState<StudentCategory | "">(
    openCategories[0] ?? ""
  );
  const [studentId, setStudentId] = useState("");
  const [educatorId, setEducatorId] = useState("");

  const studentsFiltered = availableStudents.filter(
    (student) =>
      student.programId === programId && student.category === openCategory
  );

  const selectedStudent = studentsFiltered.find((s) => s.id === studentId);
  const educatorTypeForOpen =
    openCategory === "makeup_artist" ||
    openCategory === "photographer" ||
    openCategory === "hairstylist"
      ? categoryToEducatorType[openCategory]
      : null;
  const educatorsFiltered = educators.filter((educator) => {
    if (!educatorTypeForOpen || !selectedStudent) return false;
    return (
      educator.educatorType === educatorTypeForOpen &&
      educator.instituteId === selectedStudent.instituteId
    );
  });

  return (
    <section className="space-y-4 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Assign / deassign members
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Studio teams stay at most one makeup artist, one hairstylist, and one
          photographer. Fashion designers stay on the institute roster only.
        </p>
      </div>

      {deassignState.error || assignState.error ? (
        <p className="text-sm text-destructive" role="alert">
          {deassignState.error ?? assignState.error}
        </p>
      ) : null}
      {deassignState.success || assignState.success ? (
        <p className="text-sm text-status-success" role="status">
          {deassignState.success ?? assignState.success}
        </p>
      ) : null}

      <ul className="space-y-3">
        {occupied.map((member) => (
          <li
            key={member.studentId}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default pb-3 last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-text-primary">
                {member.fullName}
              </p>
              <p className="text-sm text-text-muted">
                {STUDENT_CATEGORY_LABELS[member.category]}
              </p>
            </div>
            <form action={deassignAction}>
              <input type="hidden" name="team_id" value={teamId} />
              <input type="hidden" name="student_id" value={member.studentId} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={deassignPending}
              >
                {deassignPending ? "Removing…" : "Deassign"}
              </Button>
            </form>
          </li>
        ))}
      </ul>

      {openCategories.length > 0 ? (
        <form action={assignAction} className="space-y-3 border-t border-border-default pt-4">
          <input type="hidden" name="team_id" value={teamId} />
          <p className="text-sm font-medium text-text-primary">
            Fill open slot
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="open_category">Category</Label>
              <select
                id="open_category"
                className={selectClassName}
                value={openCategory}
                onChange={(event) => {
                  setOpenCategory(event.target.value as StudentCategory);
                  setStudentId("");
                  setEducatorId("");
                }}
              >
                {openCategories.map((category) => (
                  <option key={category} value={category}>
                    {STUDENT_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student_id">Student</Label>
              <select
                id="student_id"
                name="student_id"
                required
                className={selectClassName}
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value);
                  setEducatorId("");
                }}
              >
                <option value="">Select student</option>
                {studentsFiltered.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName} — {student.instituteName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="educator_id">Institute educator</Label>
              <select
                id="educator_id"
                name="educator_id"
                required
                className={selectClassName}
                value={educatorId}
                onChange={(event) => setEducatorId(event.target.value)}
                disabled={!studentId}
              >
                <option value="">Select educator</option>
                {educatorsFiltered.map((educator) => (
                  <option key={educator.id} value={educator.id}>
                    {educator.fullName} —{" "}
                    {EDUCATOR_TYPE_LABELS[educator.educatorType]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" size="sm" disabled={assignPending || !studentId}>
            {assignPending ? "Assigning…" : "Assign to open slot"}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-text-muted">
          All three studio roles are filled.
        </p>
      )}
    </section>
  );
}
