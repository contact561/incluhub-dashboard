"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createProgramAction,
  type CreateProgramState,
} from "@/actions/programs/createProgram";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PROGRAM_STATUSES,
  type ProgramStatus,
} from "@/lib/validations/program";
import { cn } from "@/lib/utils";

export type InstituteOption = {
  id: string;
  name: string;
};

type CreateProgramFormProps = {
  institutes: InstituteOption[];
};

const initialState: CreateProgramState = {};

const selectClassName = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export function CreateProgramForm({ institutes }: CreateProgramFormProps) {
  const [state, formAction, isPending] = useActionState(
    createProgramAction,
    initialState
  );

  const hasInstitutes = institutes.length > 0;

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="institute_id">Institute</Label>
        <select
          id="institute_id"
          name="institute_id"
          required
          disabled={isPending || !hasInstitutes}
          className={selectClassName}
          defaultValue=""
        >
          <option value="" disabled>
            {hasInstitutes ? "Select institute" : "No institutes available"}
          </option>
          {institutes.map((institute) => (
            <option key={institute.id} value={institute.id}>
              {institute.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Program name</Label>
        <Input
          id="name"
          name="name"
          required
          disabled={isPending}
          placeholder="Program name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          disabled={isPending}
          placeholder="Optional description"
          rows={3}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start date</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">End date</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          required
          disabled={isPending}
          className={selectClassName}
          defaultValue={"active" satisfies ProgramStatus}
        >
          {PROGRAM_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {!hasInstitutes ? (
        <p className="text-sm text-destructive" role="alert">
          Create an active institute before adding a program.
        </p>
      ) : null}

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={isPending || !hasInstitutes}>
          {isPending ? "Creating..." : "Create program"}
        </Button>
        <Link
          href="/admin/programs"
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
