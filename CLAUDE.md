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

## Data model (flat, except exercise groups)

- `exercises`: id, user_id, name (case-insensitive unique per user), description (optional, shown via an info icon), tracks_reps / tracks_time / tracks_weight (booleans — at least one must be true, enforced via Zod not a DB constraint), created_at.
- `sets`: id, user_id (denormalized), exercise_id (FK, cascade delete), performed_at (its date part *is* the "training day" — there is no separate Workout/session entity), reps / time_seconds / weight_kg (all optional, shown conditionally based on the exercise's tracked fields), created_at.
- `exercise_groups`: id, user_id, name (case-insensitive unique per user) — user-defined groupings (e.g. Push/Pull/Legs) purely for organizing and aggregate stats.
- `exercise_group_members`: (exercise_id, group_id) composite PK — many-to-many; an exercise can belong to any number of groups or none.
- PR badges are computed at request time via `max()` over set history for the relevant field — no separate PR table, not retroactively recomputed if history is later edited.
- Group-level stats use set *count* per day, not a value-based chart, since a group can mix exercises with incompatible units (reps/seconds/kg).
- `scripts/seed.mjs` (`npm run seed [username]`) replaces a user's exercises/groups/sets with a curated dev dataset — for local testing only, never run against real data you want to keep.

## Auth

Username + password, not email. The Supabase Auth API is email-based under the hood, so a username is deterministically mapped to a synthetic email (`{username}@setisfaction.local`) before calling `signInWithPassword`. No public self-signup — users are created manually in the Supabase dashboard. Sessions persist (`persistSession: true`) so login isn't required every time. All routes are session-protected via Next.js middleware; `ctx.userId` in the tRPC context comes from the Supabase session, never an env var.

## Conventions

- All code, identifiers, and comments in English.
- Work in milestones; commit (and push) at each one once it's verified working.
- Full historical requirements/planning discussion isn't kept here — this file only tracks durable architecture decisions and conventions, not a changelog.
