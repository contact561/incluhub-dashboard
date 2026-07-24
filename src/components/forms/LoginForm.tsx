"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type LoginState } from "@/actions/auth/login";
import { signInWithGoogleAction } from "@/actions/auth/signInWithGoogle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <div className="space-y-6">
      <form action={signInWithGoogleAction}>
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={isPending}
        >
          Continue with Google
        </Button>
        <p className="mt-2 text-center text-xs text-text-muted">
          Students: sign in with Google, then complete institute onboarding.
        </p>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border-default" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-surface-card px-2 text-text-muted">
            Admin / Educator
          </span>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isPending}
          />
        </div>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in with email"}
        </Button>

        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
      </form>
    </div>
  );
}
