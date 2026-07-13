"use client";

import { useActionState } from "react";
import {
  enrollStudentsAction,
  type EnrollStudentsState,
} from "@/actions/programs/enrollStudents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import type { EnrollableStudentOption } from "@/types/admin-records";

type EnrollStudentsFormProps = {
  programId: string;
  students: EnrollableStudentOption[];
};

const initialState: EnrollStudentsState = {};

export function EnrollStudentsForm({
  programId,
  students,
}: EnrollStudentsFormProps) {
  const [state, formAction, isPending] = useActionState(
    enrollStudentsAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="program_id" value={programId} />

      <div className="space-y-2">
        <Label>Enroll students from participating institutes</Label>
        {students.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No eligible students left to enroll. Create active students (not
            already on a team) in participating institutes first, then return
            here.
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3">
            {students.map((student) => (
              <label
                key={student.id}
                className="flex items-start gap-2 text-sm text-zinc-800"
              >
                <input
                  type="checkbox"
                  name="student_ids"
                  value={student.id}
                  disabled={isPending}
                  className="mt-0.5 size-4 rounded border-input"
                />
                <span>
                  {student.fullName} — {STUDENT_CATEGORY_LABELS[student.category]}{" "}
                  — {student.instituteName}
                  <span className="block text-xs text-zinc-500">
                    {student.email}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="text-sm text-emerald-700" role="status">
          {state.success}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending || students.length === 0}>
        {isPending ? "Enrolling..." : "Enroll selected students"}
      </Button>
    </form>
  );
}
