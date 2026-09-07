import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// One row per auth user, created on registration. Holds app-level flags that
// don't belong in Supabase Auth itself (admin status), plus the username.
//
// Username used to be embedded in a synthetic email (`{username}@setisfaction.local`)
// so login could stay username-only without Supabase's email-based auth ever
// knowing about usernames — see CLAUDE.md's "Auth" section. Now that
// registration collects a real, verified email, username needs its own
// column instead: nullable at the DB level (existing accounts are backfilled
// by a one-off script, not a migration, since it needs to read each
// account's current synthetic email) but every account ends up with one —
// filled in by that backfill for pre-existing accounts, or by
// auth.completeRegistration for new ones.
export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id").primaryKey(),
    username: text("username"),
    isAdmin: boolean("is_admin").notNull().default(false),
    // Which parts of the shared exercise catalog this user sees by default —
    // chosen once during onboarding (src/app/onboarding/exercise-categories),
    // changeable any time in Settings. Purely a visibility filter over the
    // standard catalog (see exercise.ts's getCategoryHiddenIds): never
    // affects a user's own personal exercises, and never hides a standard
    // exercise they've already logged a set against, so turning a category
    // off only declutters what they've never touched — nothing is ever lost.
    // Defaults match the app's original calisthenics-only catalog, so
    // existing accounts (created before this existed) see exactly what they
    // always have.
    wantsCalisthenics: boolean("wants_calisthenics").notNull().default(true),
    wantsGym: boolean("wants_gym").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profiles_lower_username_idx").on(sql`lower(${table.username})`)],
);

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null = a standard/shared exercise visible to every user, not owned by
    // anyone, and read-only (see CLAUDE.md's "Shared exercise catalog") —
    // only its own name/description/tracked fields are locked; group
    // membership is still per-user. Set = a personal exercise, fully owned
    // and editable by that user.
    userId: uuid("user_id"),
    name: text("name").notNull(),
    description: text("description"),
    tracksReps: boolean("tracks_reps").notNull().default(true),
    tracksTime: boolean("tracks_time").notNull().default(false),
    tracksWeight: boolean("tracks_weight").notNull().default(false),
    // Which training style a standard exercise belongs to — used to filter
    // the catalog by the viewer's profiles.wantsCalisthenics/wantsGym (see
    // exercise.ts's getCategoryHiddenIds). Null for every personal exercise
    // (always visible to its owner regardless, category doesn't apply).
    category: text("category").$type<"calisthenics" | "gym">(),
    // Set only on a personal exercise created by forking a standard one to
    // change its tracked fields (see CLAUDE.md's "Shared exercise catalog").
    // Points at the standard exercise it replaces for this user; that
    // standard exercise is hidden from the user's lists while this exists.
    forkedFromId: uuid("forked_from_id").references((): AnyPgColumn => exercises.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Case-insensitive uniqueness per user, so "Pull-Up" and "pull-up" can't both exist.
    uniqueIndex("exercises_user_id_lower_name_idx").on(table.userId, sql`lower(${table.name})`),
    // Same, among standard (userId-null) exercises — a plain unique index on
    // userId doesn't cover this because SQL never considers NULL = NULL.
    uniqueIndex("exercises_standard_lower_name_idx")
      .on(sql`lower(${table.name})`)
      .where(sql`${table.userId} is null`),
    index("exercises_user_id_name_idx").on(table.userId, table.name),
    index("exercises_forked_from_id_idx").on(table.forkedFromId),
  ],
);

// A user-defined grouping (e.g. "Push", "Legs") that exercises can optionally belong to,
// many-to-many, purely for organizing/filtering and aggregate stats — not a real hierarchy.
export const exerciseGroups = pgTable(
  "exercise_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("exercise_groups_user_id_lower_name_idx").on(table.userId, sql`lower(${table.name})`)],
);

export const exerciseGroupMembers = pgTable(
  "exercise_group_members",
  {
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => exerciseGroups.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.exerciseId, table.groupId] }),
    index("exercise_group_members_group_id_idx").on(table.groupId),
  ],
);

// A pending friend request from one user to another. Deleted once accepted
// (replaced by a `friendships` row) or declined/cancelled.
export const friendRequests = pgTable(
  "friend_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: uuid("from_user_id").notNull(),
    toUserId: uuid("to_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("friend_requests_from_to_idx").on(table.fromUserId, table.toUserId),
    index("friend_requests_to_user_id_idx").on(table.toUserId),
  ],
);

// An accepted friendship. Always stored with userIdA < userIdB (by plain
// string comparison, enforced in application code, not a DB constraint) so a
// pair is never represented by two rows or an ambiguous direction.
export const friendships = pgTable(
  "friendships",
  {
    userIdA: uuid("user_id_a").notNull(),
    userIdB: uuid("user_id_b").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userIdA, table.userIdB] }),
    index("friendships_user_id_b_idx").on(table.userIdB),
  ],
);

// A global chat visible to every registered user. Only the most recent 100
// rows are kept — see chat.send in community's chat router — so this never
// grows into something that needs its own retention/archival strategy.
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chat_messages_created_at_idx").on(table.createdAt)],
);

// A reusable workout template (e.g. "Pull Day") — the exercises/sets/targets
// to do, not tied to any specific calendar date. Called "workout" rather
// than "training day" specifically to not collide with that phrase's
// existing meaning elsewhere (a calendar date with at least one logged set —
// see stats.aggregates' totalTrainingDays).
export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("workouts_user_id_lower_name_idx").on(table.userId, sql`lower(${table.name})`)],
);

// One exercise slot within a workout. Each target field, when set at all, is
// an array with one entry per set (length === setsCount) rather than a single
// number — this is what lets a plan define a pyramid like reps 10/8/6 instead
// of the same number for every set. A null *entry* means "not fixed for that
// particular set, log it during the workout instead"; the whole column being
// null means the field was never defined for this exercise at all (every set
// behaves as if to muscle failure). Same independent-and-optional shape as
// sets.reps/timeSeconds/weightKg, just per-set. restSeconds stays a single
// value (not per-set) — null means "no fixed rest between sets of this
// exercise, rest as long as you want" (the "define pause" checkbox
// unchecked, in the UI).
export const workoutExercises = pgTable(
  "workout_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    setsCount: integer("sets_count").notNull(),
    targetReps: jsonb("target_reps").$type<(number | null)[]>(),
    targetTimeSeconds: jsonb("target_time_seconds").$type<(number | null)[]>(),
    targetWeightKg: jsonb("target_weight_kg").$type<(number | null)[]>(),
    restSeconds: integer("rest_seconds"),
  },
  (table) => [index("workout_exercises_workout_id_idx").on(table.workoutId)],
);

// A named weekly schedule of workouts. A user can have several (e.g. a
// "deload" week alongside their normal one) but at most one active at a
// time — enforced by the partial unique index below, not just app code.
export const trainingPlans = pgTable(
  "training_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("training_plans_user_id_lower_name_idx").on(table.userId, sql`lower(${table.name})`),
    uniqueIndex("training_plans_one_active_per_user_idx").on(table.userId).where(sql`${table.isActive}`),
  ],
);

// Which workout (if any) falls on which weekday of a plan — a weekday with
// no row here is a rest day. weekday matches JS's Date#getDay() (0 = Sunday
// .. 6 = Saturday) so the Today page can look itself up with no translation.
export const trainingPlanWorkouts = pgTable(
  "training_plan_workouts",
  {
    trainingPlanId: uuid("training_plan_id")
      .notNull()
      .references(() => trainingPlans.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.trainingPlanId, table.weekday] })],
);

export const sets = pgTable(
  "sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Denormalized from exercises.userId so set queries don't need a join to filter by owner.
    userId: uuid("user_id").notNull(),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
    reps: integer("reps"),
    timeSeconds: integer("time_seconds"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2, mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sets_user_id_performed_at_idx").on(table.userId, table.performedAt),
    index("sets_user_id_exercise_id_performed_at_idx").on(table.userId, table.exerciseId, table.performedAt),
  ],
);
