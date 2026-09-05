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

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
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
