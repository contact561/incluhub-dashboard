"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createUserAction,
  type CreateUserState,
} from "@/actions/users/createUser";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EDUCATOR_TYPE_LABELS,
  EXTERNAL_MEMBER_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  STUDENT_CATEGORY_LABELS,
  USER_ROLE_LABELS,
} from "@/lib/constants/labels";
import {
  EDUCATOR_TYPES,
  EXTERNAL_MEMBER_TYPES,
  PAYMENT_STATUSES,
  ADMIN_ASSIGNABLE_PROFILE_STATUSES,
  STUDENT_CATEGORIES,
  USER_ROLES,
  type ProfileStatus,
} from "@/lib/validations/user";
import type { UserRole } from "@/types/database";
import { cn } from "@/lib/utils";

export type InstituteOption = {
  id: string;
  name: string;
};

type CreateUserFormProps = {
  institutes: InstituteOption[];
};

const initialState: CreateUserState = {};

const selectClassName = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export function CreateUserForm({ institutes }: CreateUserFormProps) {
  const [state, formAction, isPending] = useActionState(
    createUserAction,
    initialState
  );
  const [role, setRole] = useState<UserRole>("student");

  const needsInstitute = role === "student" || role === "educator";
  const hasInstitutes = institutes.length > 0;

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          required
          disabled={isPending}
          placeholder="Full name"
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          disabled={isPending}
          placeholder="user@example.com"
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          disabled={isPending}
          placeholder="Optional"
          autoComplete="tel"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Temporary password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          disabled={isPending}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            required
            disabled={isPending}
            className={selectClassName}
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            {USER_ROLES.map((value) => (
              <option key={value} value={value}>
                {USER_ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            required
            disabled={isPending}
            className={selectClassName}
            defaultValue={"active" satisfies ProfileStatus}
          >
            {ADMIN_ASSIGNABLE_PROFILE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {role === "student" ? (
        <div className="space-y-5 rounded-lg border border-zinc-200 p-4">
          <p className="text-sm font-medium text-zinc-900">Student details</p>

          <div className="space-y-2">
            <Label htmlFor="student_category">Student category</Label>
            <select
              id="student_category"
              name="student_category"
              required
              disabled={isPending}
              className={selectClassName}
              defaultValue=""
            >
              <option value="" disabled>
                Select category
              </option>
              {STUDENT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {STUDENT_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

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
            <Label htmlFor="payment_status">Payment status</Label>
            <select
              id="payment_status"
              name="payment_status"
              required
              disabled={isPending}
              className={selectClassName}
              defaultValue="pending"
            >
              {PAYMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {PAYMENT_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {role === "educator" ? (
        <div className="space-y-5 rounded-lg border border-zinc-200 p-4">
          <p className="text-sm font-medium text-zinc-900">Educator details</p>

          <div className="space-y-2">
            <Label htmlFor="educator_type">Educator type</Label>
            <select
              id="educator_type"
              name="educator_type"
              required
              disabled={isPending}
              className={selectClassName}
              defaultValue=""
            >
              <option value="" disabled>
                Select type
              </option>
              {EDUCATOR_TYPES.map((value) => (
                <option key={value} value={value}>
                  {EDUCATOR_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

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
        </div>
      ) : null}

      {role === "external_member" ? (
        <div className="space-y-5 rounded-lg border border-zinc-200 p-4">
          <p className="text-sm font-medium text-zinc-900">
            External member details
          </p>

          <div className="space-y-2">
            <Label htmlFor="external_member_type">External member type</Label>
            <select
              id="external_member_type"
              name="external_member_type"
              required
              disabled={isPending}
              className={selectClassName}
              defaultValue=""
            >
              <option value="" disabled>
                Select type
              </option>
              {EXTERNAL_MEMBER_TYPES.map((value) => (
                <option key={value} value={value}>
                  {EXTERNAL_MEMBER_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {needsInstitute && !hasInstitutes ? (
        <p className="text-sm text-destructive" role="alert">
          Add at least one institute in Supabase before creating students or
          educators.
        </p>
      ) : null}

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          disabled={isPending || (needsInstitute && !hasInstitutes)}
        >
          {isPending ? "Creating..." : "Create user"}
        </Button>
        <Link
          href="/admin/users"
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
