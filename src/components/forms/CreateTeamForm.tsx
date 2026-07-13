"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  createTeamAction,
  type CreateTeamState,
} from "@/actions/teams/createTeam";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EDUCATOR_TYPE_LABELS,
  STUDENT_CATEGORY_LABELS,
} from "@/lib/constants/labels";
import type { TeamCreateOptions } from "@/types/admin-records";
import type { EducatorType, StudentCategory } from "@/types/database";
import { cn } from "@/lib/utils";

type CreateTeamFormProps = {
  options: TeamCreateOptions;
};

const initialState: CreateTeamState = {};

const selectClassName = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

function studentLabel(
  fullName: string,
  category: StudentCategory,
  instituteName: string
): string {
  return `${fullName} — ${STUDENT_CATEGORY_LABELS[category]} — ${instituteName}`;
}

function educatorLabel(
  fullName: string,
  educatorType: EducatorType,
  instituteName: string
): string {
  return `${fullName} — ${EDUCATOR_TYPE_LABELS[educatorType]} — ${instituteName}`;
}

const categoryToEducatorType: Record<StudentCategory, EducatorType> = {
  makeup_artist: "makeup_educator",
  photographer: "photography_educator",
  hairstylist: "hairstyling_educator",
};

export function CreateTeamForm({ options }: CreateTeamFormProps) {
  const [state, formAction, isPending] = useActionState(
    createTeamAction,
    initialState
  );
  const [programId, setProgramId] = useState("");
  const [makeupStudentId, setMakeupStudentId] = useState("");
  const [photoStudentId, setPhotoStudentId] = useState("");
  const [hairStudentId, setHairStudentId] = useState("");

  const enrolledStudents = useMemo(
    () => options.students.filter((student) => student.programId === programId),
    [options.students, programId]
  );

  const programStats = useMemo(
    () =>
      options.enrollmentStats.find((stats) => stats.programId === programId) ??
      null,
    [options.enrollmentStats, programId]
  );

  const studentsFor = (category: StudentCategory) =>
    enrolledStudents.filter((student) => student.category === category);

  const selectedStudents = useMemo(() => {
    const byId = new Map(enrolledStudents.map((student) => [student.id, student]));
    return {
      makeup: byId.get(makeupStudentId) ?? null,
      photo: byId.get(photoStudentId) ?? null,
      hair: byId.get(hairStudentId) ?? null,
    };
  }, [enrolledStudents, makeupStudentId, photoStudentId, hairStudentId]);

  const educatorsForStudent = (
    student: { instituteId: string; category: StudentCategory } | null
  ) => {
    if (!student) {
      return [];
    }
    const educatorType = categoryToEducatorType[student.category];
    return options.educators.filter(
      (educator) =>
        educator.instituteId === student.instituteId &&
        educator.educatorType === educatorType
    );
  };

  const makeupStudents = studentsFor("makeup_artist");
  const photographerStudents = studentsFor("photographer");
  const hairstylistStudents = studentsFor("hairstylist");
  const makeupEducators = educatorsForStudent(selectedStudents.makeup);
  const photographyEducators = educatorsForStudent(selectedStudents.photo);
  const hairstylingEducators = educatorsForStudent(selectedStudents.hair);

  const hasPrograms = options.programs.length > 0;
  const canSubmit =
    Boolean(programId) &&
    makeupStudents.length > 0 &&
    photographerStudents.length > 0 &&
    hairstylistStudents.length > 0 &&
    Boolean(makeupStudentId) &&
    Boolean(photoStudentId) &&
    Boolean(hairStudentId) &&
    makeupEducators.length > 0 &&
    photographyEducators.length > 0 &&
    hairstylingEducators.length > 0;

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="team_name">Team name</Label>
        <Input
          id="team_name"
          name="team_name"
          required
          disabled={isPending}
          placeholder="Team A"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="program_id">Program / Batch</Label>
        <select
          id="program_id"
          name="program_id"
          required
          disabled={isPending || !hasPrograms}
          className={selectClassName}
          value={programId}
          onChange={(event) => {
            setProgramId(event.target.value);
            setMakeupStudentId("");
            setPhotoStudentId("");
            setHairStudentId("");
          }}
        >
          <option value="" disabled>
            {hasPrograms ? "Select program" : "No active programs"}
          </option>
          {options.programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <p className="text-sm font-medium text-zinc-900">
          Enrolled students (may be from different institutes)
        </p>

        {(
          [
            {
              id: "makeup_artist_student_id",
              label: STUDENT_CATEGORY_LABELS.makeup_artist,
              options: makeupStudents,
              value: makeupStudentId,
              setValue: setMakeupStudentId,
            },
            {
              id: "photographer_student_id",
              label: STUDENT_CATEGORY_LABELS.photographer,
              options: photographerStudents,
              value: photoStudentId,
              setValue: setPhotoStudentId,
            },
            {
              id: "hairstylist_student_id",
              label: STUDENT_CATEGORY_LABELS.hairstylist,
              options: hairstylistStudents,
              value: hairStudentId,
              setValue: setHairStudentId,
            },
          ] as const
        ).map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <select
              id={field.id}
              name={field.id}
              required
              disabled={isPending || !programId || field.options.length === 0}
              className={selectClassName}
              value={field.value}
              onChange={(event) => field.setValue(event.target.value)}
            >
              <option value="" disabled>
                {!programId
                  ? "Select program first"
                  : field.options.length > 0
                    ? `Select ${field.label.toLowerCase()}`
                    : `No enrolled ${field.label.toLowerCase()} available`}
              </option>
              {field.options.map((student) => (
                <option key={student.id} value={student.id}>
                  {studentLabel(
                    student.fullName,
                    student.category,
                    student.instituteName
                  )}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <p className="text-sm font-medium text-zinc-900">
          Educators (must match each student&apos;s institute)
        </p>

        {(
          [
            {
              id: "makeup_educator_id",
              label: EDUCATOR_TYPE_LABELS.makeup_educator,
              options: makeupEducators,
              studentSelected: Boolean(makeupStudentId),
            },
            {
              id: "photography_educator_id",
              label: EDUCATOR_TYPE_LABELS.photography_educator,
              options: photographyEducators,
              studentSelected: Boolean(photoStudentId),
            },
            {
              id: "hairstyling_educator_id",
              label: EDUCATOR_TYPE_LABELS.hairstyling_educator,
              options: hairstylingEducators,
              studentSelected: Boolean(hairStudentId),
            },
          ] as const
        ).map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <select
              id={field.id}
              name={field.id}
              required
              disabled={
                isPending || !field.studentSelected || field.options.length === 0
              }
              className={selectClassName}
              defaultValue=""
              key={`${field.id}-${makeupStudentId}-${photoStudentId}-${hairStudentId}`}
            >
              <option value="" disabled>
                {!field.studentSelected
                  ? "Select matching student first"
                  : field.options.length > 0
                    ? `Select ${field.label.toLowerCase()}`
                    : `No matching educator at student institute`}
              </option>
              {field.options.map((educator) => (
                <option key={educator.id} value={educator.id}>
                  {educatorLabel(
                    educator.fullName,
                    educator.educatorType,
                    educator.instituteName
                  )}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {programId && !canSubmit ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p>
            Team create only lists enrolled students who are not already on
            another team.
          </p>
          {programStats && programStats.alreadyOnTeamCount > 0 ? (
            <p>
              {programStats.alreadyOnTeamCount} enrolled student
              {programStats.alreadyOnTeamCount === 1 ? " is" : "s are"} already
              on a team, so they do not appear here.
            </p>
          ) : null}
          {programStats && programStats.availableCount === 0 ? (
            <p>
              No available enrolled students yet. Open the program page, enroll
              free students (1 makeup, 1 photographer, 1 hairstylist), then
              return here.
            </p>
          ) : (
            <p>
              Make sure this program has one available enrolled student in each
              category, then select matching educators from each student&apos;s
              institute.
            </p>
          )}
          <Link
            href={`/admin/programs/${programId}`}
            className="inline-flex font-medium underline underline-offset-2"
          >
            Manage enrollments for this program
          </Link>
        </div>
      ) : null}

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={isPending || !canSubmit}>
          {isPending ? "Creating..." : "Create team"}
        </Button>
        <Link
          href="/admin/teams"
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
