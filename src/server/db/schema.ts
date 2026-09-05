import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// One row per auth user, created on registration. Only holds app-level flags
// that don't belong in Supabase Auth itself (currently just admin status).
export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null = a standard/shared exercise visible to every user, not owned by
    // anyone. Set = a personal exercise, either user-created from scratch or
    // forked from a standard one (see forkedFromId).
    userId: uuid("user_id"),
    // Set only when this personal exercise was created by editing a standard
    // (userId-null) exercise — lets the exercise list hide the original
    // standard row once a user has their own edited copy of it.
    forkedFromId: uuid("forked_from_id"),
    name: text("name").notNull(),
    description: text("description"),
    tracksReps: boolean("tracks_reps").notNull().default(true),
    tracksTime: boolean("tracks_time").notNull().default(false),
    tracksWeight: boolean("tracks_weight").notNull().default(false),
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
