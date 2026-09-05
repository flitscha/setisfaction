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

- `exercises`: id, user_id (**nullable** — null means a standard exercise shared with every user; see "Shared exercise catalog" below), forked_from_id (nullable, set when a personal exercise was created by editing a standard one), name (case-insensitive unique per user, and separately unique among standard exercises via a partial index), description (optional, shown via an info icon), tracks_reps / tracks_time / tracks_weight (booleans — at least one must be true, enforced via Zod not a DB constraint), created_at.
- `sets`: id, user_id (denormalized), exercise_id (FK, cascade delete), performed_at (its date part *is* the "training day" — there is no separate Workout/session entity), reps / time_seconds / weight_kg (all optional, shown conditionally based on the exercise's tracked fields), created_at.
- `exercise_groups`: id, user_id, name (case-insensitive unique per user) — user-defined groupings (e.g. Push/Pull/Legs) purely for organizing and aggregate stats.
- `exercise_group_members`: (exercise_id, group_id) composite PK — many-to-many; an exercise can belong to any number of groups or none.
- PR badges are computed at request time via `max()` over set history for the relevant field — no separate PR table, not retroactively recomputed if history is later edited.
- Group-level stats use set *count* per day, not a value-based chart, since a group can mix exercises with incompatible units (reps/seconds/kg).
- `scripts/seed.mjs` (`npm run seed [username]`) ensures the shared catalog has the full curated list (idempotent — safe to run for multiple users, reuses existing rows instead of duplicating them), then replaces that one user's own groups/sets with a realistic dev history against it — for local testing only, never run against real data you want to keep.

## Shared exercise catalog

Every user sees the same standard exercise list by default — `exercises.user_id IS NULL` — rather than each user getting their own duplicated copy. A personal exercise (`user_id` set) is either user-created from scratch, or a **fork**: editing a standard exercise never changes the shared row, it creates the editor's own copy (`forked_from_id` set) and moves only *that user's own* past sets onto it, so their history doesn't split and nobody else's data is touched (`exercise.update` in `exercise.ts`). The exercise list hides a standard row once the viewer has their own fork of it, so it doesn't show up twice.

This touches most exercise-related queries, not just `exercise.ts` — anywhere `sets`/`exercises` are joined or scoped, use `sets.userId`, never `exercises.userId`, to mean "this viewer's own [sets/PRs/exercise-group memberships]," since a standard exercise's id is shared across users:
- PR calculation (`getPreviousBest` in `set.ts`) and the per-exercise set counts in `stats.aggregates` are scoped to `sets.userId` — otherwise a standard exercise's PR/count would blend every user's history together.
- Group membership (`getGroupIdsByExercise` in `exercise.ts`) joins through `exercise_groups.user_id` — a plain `exercise_group_members` lookup by exercise id would leak *other users'* group organization of the same shared exercise.
- `admin.deleteUser` deletes a user's `sets` explicitly rather than relying on cascading from deleting their `exercises` — a standard exercise is never deleted, so that cascade alone would miss sets logged against it.
- Logging a set (`assertOwnsExercise` in `set.ts`) allows the exercise to be either the user's own or a standard one.

The migration promoting the initial production data (felix's already-seeded exercises, which matched the curated list exactly) to standard was a one-off manual `UPDATE exercises SET user_id = NULL ...` — not a script kept in the repo.

Every user also starts with the same default grouping of the standard catalog (`applyStandardGrouping` in `src/server/db/standard-groups.ts`, called from `auth.register`) — their own `exercise_groups` rows, freely renamed/reassigned/deleted afterward like any group. The name→groups mapping there is a hand-kept duplicate of `scripts/seed.mjs`'s `EXERCISES` list; update both when a standard exercise is added.

## Auth

Username + password, not email. The Supabase Auth API is email-based under the hood, so a username is deterministically mapped to a synthetic email (`{username}@setisfaction.local`) before calling `signInWithPassword`. Sessions persist (`persistSession: true`) so login isn't required every time. All routes are session-protected via Next.js proxy (middleware); `ctx.userId` in the tRPC context comes from the Supabase session, never an env var. `/login` and `/register` are the only public pages (`src/lib/auth-pages.ts` is the shared list the proxy and layout chrome both check).

Registration (`/register`, `auth.register` tRPC mutation) creates the user via the Supabase **admin** API (`SUPABASE_SERVICE_ROLE_KEY`, server-only) rather than the public `signUp()` client call — the public signup endpoint validates the email's domain has real DNS/MX records and rejects `@setisfaction.local`, while the privileged admin `createUser` (with `email_confirm: true`) bypasses that check entirely. The client then calls `signInWithPassword` right after to establish a session.

## Admin

- `profiles` table (`user_id` PK, `is_admin`) holds app-level flags Supabase Auth itself doesn't have a place for; a row is inserted on registration, defaulting to non-admin. Promote/demote with `npm run set-admin -- <username> [true|false]` (no UI for this — deliberately rare and manual).
- `ctx.isAdmin` is resolved in the tRPC context from `profiles`; `adminProcedure` (in `trpc.ts`) builds on `protectedProcedure` and throws `FORBIDDEN` unless it's set.
- Supabase Auth's users live in the `auth` schema of the same Postgres database, so the admin router reads them with a raw SQL query (`auth.users`) instead of modeling that table in Drizzle — it's Supabase-managed, not ours to migrate.
- **Viewing another user's pages ("view as"):** an admin browsing `/admin/[userId]/*` sees the *exact same* Today/Exercises/Stats page components the signed-in user would, read-only, rather than a separately maintained admin view. This is deliberate, so future features don't need a parallel admin UI:
  - `readProcedure` (in `trpc.ts`) resolves `ctx.viewUserId` — the target user's id when viewing-as, otherwise the caller's own — and is what every data-listing/query procedure across the routers uses to scope its `where`. `writeProcedure` is the mutation counterpart; it throws `FORBIDDEN` outright while viewing-as, so a mutation never silently lands on the wrong account.
  - The client sends the viewed user's id via an `x-view-as-user-id` header, backed by an external store (`src/lib/view-as.ts`, plain module state + subscribers — not React context) so any component can read it via `useViewAsUser()`/`useAppPath()` (`src/components/admin/view-as-context.tsx`) regardless of where it sits in the tree. This matters because `TopBar` and `BottomNav` render as siblings above the admin route in `layout.tsx`, not as its descendants. `useViewAsUser()` drives read-only UI gating (hide "+", edit, delete controls) and lets `TopBar` swap in the "viewing as" bar; `useAppPath()` rewrites an app-relative link so in-page navigation stays inside the admin view instead of jumping to the admin's own pages.
  - Routes under `/admin/[userId]/...` are thin re-exports of the real pages (e.g. `export { default } from "@/app/today/page"`); `src/app/admin/[userId]/layout.tsx` fetches the target user's identity and mounts `ViewAsRegistration` to register it in the store. Adding a new top-level page later only needs one such re-export file to become admin-viewable — no duplicated UI.
  - The "viewing as" state replaces `TopBar`'s normal content with a single amber bar (back arrow + username, delete icon, exit) instead of stacking a second banner underneath — deliberately kept as one sticky bar so it isn't lost on scroll and doesn't duplicate the app's own header.
- Deleting a user (`admin.deleteUser`) removes their `sets` (explicitly — see "Shared exercise catalog" below), `exercises`/`exercise_groups`/`profiles` rows (the latter two cascade `exercise_group_members` via existing FKs), and then their Supabase Auth account; blocked for the admin's own account. The client gates the button (in the "viewing as" top bar) behind typing the exact username in a confirmation modal — irreversible, so no soft-delete/undo.

## Conventions

- All code, identifiers, and comments in English.
- Work in milestones; commit (and push) at each one once it's verified working.
- Full historical requirements/planning discussion isn't kept here — this file only tracks durable architecture decisions and conventions, not a changelog.
