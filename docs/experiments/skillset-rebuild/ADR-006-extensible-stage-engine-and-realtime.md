# ADR-006: Extensible stage engine and realtime

## Status

Accepted — foundational NFR

## Context

Founder will add sessions/stages between existing program steps. Student and educator dashboards must adapt without a full rewrite.

## Decision

1. **`stage_definitions` registry** — ordered, typed, activatable steps with jsonb config  
2. **Progress** keyed to definition IDs, not only hard-coded integers  
3. **Adaptive shells** — student/educator dashboards render modules by `stage_type`  
4. **Insert path** — new mid-program step = new definition + module UI + RPCs/events  
5. **Realtime** — Supabase Realtime (plus notification rows) for progress, bookings, broadcasts; educator channels filtered by institute RLS  
6. Unknown future `stage_type` → safe placeholder module until a specific UI ships  

Build Phase **2b** before packing BMS/mood/studio as one-off pages only.

## Consequences

- Slightly more upfront design than fixed Stage 0–5 pages
- Enables Stage 4/5 and workshops later as modules
- Requires careful RLS on realtime channels
