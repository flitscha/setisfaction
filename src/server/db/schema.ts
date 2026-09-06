import {
  type AnyPgColumn,
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
