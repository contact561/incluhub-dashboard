# ADR-001: Stack

## Status

Accepted (experiment)

## Context

Rebuild IncluHub with Cursor skills while keeping a known-good hosting/data path.

## Decision

- Next.js (App Router) + TypeScript + Tailwind + shadcn-style UI
- Supabase Auth, Postgres, RLS, Storage (as needed), Realtime
- Server Actions / RPCs for mutations
- Vercel hosting
- Playwright + unit tests for gates

## Consequences

- Aligns with `using-ui-stack`, `adding-auth` patterns, `setting-up-ci`
- Does not adopt Auth.js, Stripe, or Kubernetes for this experiment
