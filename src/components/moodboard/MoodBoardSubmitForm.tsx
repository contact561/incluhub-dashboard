"use client";

import { useActionState } from "react";
import {
  submitMoodBoardAction,
  type SubmitMoodBoardState,
} from "@/actions/moodboard/submitMoodBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SubmitMoodBoardState = {};

export function MoodBoardSubmitForm() {
  const [state, action, pending] = useActionState(
    submitMoodBoardAction,
    initialState
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required minLength={3} disabled={pending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mood_board_url">Mood board URL</Label>
        <Input
          id="mood_board_url"
          name="mood_board_url"
          type="url"
          required
          placeholder="https://"
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          disabled={pending}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-status-success" role="status">
          {state.success}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit mood board"}
      </Button>
    </form>
  );
}
