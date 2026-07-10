"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createInstituteAction,
  type CreateInstituteState,
} from "@/actions/institutes/createInstitute";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  INSTITUTE_STATUSES,
  type InstituteStatus,
} from "@/lib/validations/institute";
import { cn } from "@/lib/utils";

const initialState: CreateInstituteState = {};

const selectClassName = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export function CreateInstituteForm() {
  const [state, formAction, isPending] = useActionState(
    createInstituteAction,
    initialState
  );

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          disabled={isPending}
          placeholder="Institute name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          name="address"
          disabled={isPending}
          placeholder="Optional address"
          rows={3}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            disabled={isPending}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            disabled={isPending}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website_or_social">Website or social</Label>
        <Input
          id="website_or_social"
          name="website_or_social"
          disabled={isPending}
          placeholder="Optional URL or handle"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="authorized_person_name">Authorized person</Label>
        <Input
          id="authorized_person_name"
          name="authorized_person_name"
          disabled={isPending}
          placeholder="Optional contact name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          required
          disabled={isPending}
          className={selectClassName}
          defaultValue={"active" satisfies InstituteStatus}
        >
          {INSTITUTE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create institute"}
        </Button>
        <Link
          href="/admin/institutes"
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
