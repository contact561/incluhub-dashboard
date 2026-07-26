"use client";

import { useActionState } from "react";
import {
  completeStudentOnboardingAction,
  type CompleteOnboardingState,
} from "@/actions/auth/completeStudentOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { STUDENT_CATEGORIES } from "@/lib/validations/user";

const initialState: CompleteOnboardingState = {};

export type InstituteOption = { id: string; name: string };

export function StudentOnboardingForm({
  institutes,
  defaultFullName,
}: {
  institutes: InstituteOption[];
  defaultFullName: string;
}) {
  const [state, action, pending] = useActionState(
    completeStudentOnboardingAction,
    initialState
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          required
          minLength={2}
          defaultValue={defaultFullName}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="institute_id">Your institute</Label>
        <select
          id="institute_id"
          name="institute_id"
          required
          disabled={pending || institutes.length === 0}
          className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          defaultValue=""
        >
          <option value="" disabled>
            Select institute
          </option>
          {institutes.map((institute) => (
            <option key={institute.id} value={institute.id}>
              {institute.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="student_category">Category</Label>
        <select
          id="student_category"
          name="student_category"
          required
          disabled={pending}
          className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          defaultValue=""
        >
          <option value="" disabled>
            Select category
          </option>
          {STUDENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {STUDENT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" name="phone" type="tel" disabled={pending} />
      </div>

      {institutes.length === 0 ? (
        <p className="text-sm text-destructive" role="alert">
          No institutes are available yet. Ask IncluHub Admin to add your
          institute, then refresh this page.
        </p>
      ) : null}

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending || institutes.length === 0}>
        {pending ? "Saving…" : "Complete onboarding"}
      </Button>
    </form>
  );
}
