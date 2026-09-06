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

- `exercises`: id, user_id (**nullable** — null means a standard exercise shared with every user; see "Shared exercise catalog" below), name (case-insensitive unique per user, and separately unique among standard exercises via a partial index), description (optional, shown via an info icon), tracks_reps / tracks_time / tracks_weight (booleans — at least one must be true, enforced via Zod not a DB constraint), created_at.
- `sets`: id, user_id (denormalized), exercise_id (FK, cascade delete), performed_at (its date part *is* the "training day" — there is no separate Workout/session entity), reps / time_seconds / weight_kg (all optional, shown conditionally based on the exercise's tracked fields), created_at.
- `exercise_groups`: id, user_id, name (case-insensitive unique per user) — user-defined groupings (e.g. Push/Pull/Legs) purely for organizing and aggregate stats.
- `exercise_group_members`: (exercise_id, group_id) composite PK — many-to-many; an exercise can belong to any number of groups or none.
- PR badges are computed at request time via `max()` over set history for the relevant field — no separate PR table, not retroactively recomputed if history is later edited.
- Group-level stats use set *count* per day, not a value-based chart, since a group can mix exercises with incompatible units (reps/seconds/kg).
- `scripts/seed.mjs` (`npm run seed [username]`) ensures the shared catalog has the full curated list (idempotent — safe to run for multiple users, reuses existing rows instead of duplicating them), then replaces that one user's own groups/sets with a realistic dev history against it — for local testing only, never run against real data you want to keep.

## Shared exercise catalog

Every user sees the same standard exercise list by default — `exercises.user_id IS NULL` — rather than each user getting their own duplicated copy. A standard exercise's **name and description** are read-only for everyone (`exercise.update` only ever matches rows where `userId = ctx.userId`, so it 404s on a standard exercise) — that's deliberate, not a missing feature: an earlier version let editing a standard exercise fork a personal copy on *any* edit, but a small edit (even a typo) then silently produced a second, confusingly-similar exercise with its own history, with no obvious way back. `exercise.updateStandard` is the one thing a standard exercise's own page can still change, and it splits in two:
- Grouping (which of the user's own groups it's filed into) always just updates membership in place — purely personal, no forking.
- Tracked fields (reps/time/weight) are different: since they have to stay identical for everyone for comparability, changing them instead forks a personal copy (`exercises.forked_from_id` points at the standard exercise it replaces) — same name, taking over this user's past sets on it (`sets.exercise_id` moved in the same transaction) — and the standard exercise is hidden from *this user's* lists while the fork exists (`getForkedAwayStandardIds` in `exercise.ts`, applied in `list`/`getById`). `exercise.restoreStandard` undoes it: sets move back, the fork row is deleted, and the standard reappears with its grouping exactly as it was (those `exercise_group_members` rows were never touched, just orphaned from view). This avoids the old failure mode because the trigger is narrow and explicit (a deliberate type change, not any edit) and the name can never drift, so there's never a same-name duplicate to be confused by.

A genuinely different exercise is just a new one, created from scratch (fully owned, fully editable, deletable, including its tracked fields — no forking involved once it's the user's own). `ExerciseCard`/`ExerciseSummaryRow` show a "Custom" badge for any exercise with a non-null `userId`, forked or not, so it's visually distinct from a standard one.

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

## Community (friends)

- `friend_requests` (from_user_id, to_user_id) — one row per pending request. `friendships` (user_id_a, user_id_b) — one row per accepted friendship, always stored with the lower id first (plain string comparison in app code, not a DB constraint) so a pair is never two rows or ambiguous which direction. Sending a request when the other side already sent one accepts it immediately instead of leaving two pending rows.
- `community.listUsers` is a non-admin directory of every other user (username + friendship status only — no training data) so you can find someone without knowing their exact username; contrast with `admin.listUsers`, which additionally exposes total set counts and is admin-only.
- Every friend-scoped read (`friendAggregates`/`friendExercises`/`friendGroups`/`friendExerciseHistory`) calls `assertFriends(ctx.userId, input.userId)` first and throws `FORBIDDEN` otherwise — checked server-side on every call, never inferred from what the client claims. These reuse the exact same queries the signed-in user's own pages run: `exercise.ts`/`stats.ts`/`set.ts` each export a plain `userId`-parameterized function (`listVisibleExercises`, `getAggregatesForUser`, `getSetsByExercise`) that their own `readProcedure`s call with `ctx.viewUserId`, and that `community.ts` calls with the friend's id after the friendship check — one query path, two authorization stories.
- Community intentionally does **not** reuse the admin "view as" mechanism (`ctx.viewingAsUserId`/`ctx.viewUserId`) — every community procedure uses `ctx.userId` directly, always the real signed-in user, even while an admin is viewing someone else's pages. Friends are a personal relationship, not something that should shift based on whose data an admin happens to be looking at.
- **Friend profile popup**: clicking a friend (in Directory/Friends) opens their stats in a large overlay (`FriendProfileModal`), not a route — deliberately, so it can never be confused with the signed-in user's own pages the way reusing "view as" would invite. It's driven by an external store (`src/lib/friend-profile.ts`, same plain-module-state-plus-subscribers pattern as `view-as.ts`) so any component can call `openFriendProfile()` without prop-drilling. The popup's own exercise drill-down and the real `/stats/[exerciseId]` page share `ExerciseProgressView` (`src/components/stats/exercise-progress-view.tsx`) so they render identically instead of being two maintained implementations.
- **Comparison chart**: on a standard exercise (never a personal one — only there is the exercise id genuinely shared), `ExerciseProgressView` accepts an optional `comparison` prop that overlays a second person's "best per day" line (dashed) on the primary one (solid) via `ComparisonTrendChart`, which positions points by actual date rather than array index like the plain `TrendChart` does — two people rarely train on the same days, so index-aligning them would line up unrelated training days. `history` is always the solid "primary" series and `primaryLabel` names it — the signed-in user's own `/stats/[exerciseId]` page passes its own history as primary and a picked friend as `comparison`; the friend profile popup's "Compare with me" toggle passes the *friend's* history as primary (`primaryLabel` = their username) and the signed-in user's own as `comparison` — same component, whichever side is "you" flips correctly.
- `scripts/create-test-users.mjs` (`npm run create-test-users`) creates a fixed, repeatable `user1`/`user2`/`user3` fixture (password `123455`) via the real registration endpoint (dev server must be running) rather than throwaway accounts, since real user data already lives in this database and must never be touched while testing. `user1`/`user2` get seeded training history and are pre-friended; `user3` is left with no relationships, so both the "already friends" and "pending request" states are ready to test immediately.

## Conventions

- All code, identifiers, and comments in English.
- Work in milestones; commit (and push) at each one once it's verified working.
- Full historical requirements/planning discussion isn't kept here — this file only tracks durable architecture decisions and conventions, not a changelog.
