@AGENTS.md

# Setisfaction

Minimalist, mobile-first calisthenics workout-logging PWA. Log sets fast during a workout, review progress and training consistency afterward.

## Architecture

- Next.js (TypeScript, App Router), deployed on Vercel. Frontend + backend (API routes) in one project — no standalone server.
- PWA (installable via "Add to Home Screen"), online-only — no offline-first/background-sync.
- tRPC for the API layer, Zod for input validation, `superjson` as the transformer (so `Date` survives the wire untouched).
- Drizzle ORM against Postgres, versioned SQL migrations (`drizzle-kit generate` → review the diff → `drizzle-kit migrate`). Migrations run against `DIRECT_URL` (Supabase session pooler, port 5432 — used instead of the IPv6-only direct connection host); the running app uses `DATABASE_URL` (transaction pooler, port 6543, driver configured with `{ prepare: false }`).
- Supabase hosts Postgres and Auth (free tier).
- Tailwind CSS, mobile-first.

## Data model (flat, no hierarchy)

- `exercises`: id, user_id, name (case-insensitive unique per user), category (optional free-text tag — display/filter only, not a real hierarchy), tracks_reps / tracks_time / tracks_weight (booleans — at least one must be true, enforced via Zod not a DB constraint), created_at.
- `sets`: id, user_id (denormalized), exercise_id (FK, cascade delete), performed_at (its date part *is* the "training day" — there is no separate Workout/session entity), reps / time_seconds / weight_kg (all optional, shown conditionally based on the exercise's tracked fields), created_at.
- PR badges are computed at request time via `max()` over set history for the relevant field — no separate PR table, not retroactively recomputed if history is later edited.

## Auth

Username + password, not email. The Supabase Auth API is email-based under the hood, so a username is deterministically mapped to a synthetic email (`{username}@setisfaction.local`) before calling `signInWithPassword`. No public self-signup — users are created manually in the Supabase dashboard. Sessions persist (`persistSession: true`) so login isn't required every time. All routes are session-protected via Next.js middleware; `ctx.userId` in the tRPC context comes from the Supabase session, never an env var.

## Conventions

- All code, identifiers, and comments in English.
- Work in milestones; commit (and push) at each one once it's verified working.
- Full historical requirements/planning discussion isn't kept here — this file only tracks durable architecture decisions and conventions, not a changelog.
