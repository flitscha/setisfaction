import { eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { exerciseGroupMembers, exerciseGroups, exercises } from "@/server/db/schema";

// The default grouping every user starts with for the shared exercise
// catalog — purely a starting point, since exercise_groups are per-user and
// freely renamed/reassigned/deleted afterward. Keep this in sync with
// scripts/seed.mjs's EXERCISES list when a standard exercise is added.
export const STANDARD_GROUP_NAMES = [
  "Push",
  "Pull",
  "Legs",
  "Handstand",
  "Front Lever",
  "Back Lever",
  "L-Sit",
  "Planche",
];

export const STANDARD_EXERCISE_GROUPS: Record<string, string[]> = {
  "Push-Ups": ["Push"],
  "Push-Ups (Deep, Parallettes)": ["Push"],
  Dips: ["Push"],
  "Diamond Push-Ups": ["Push"],
  "Lateral Raises": ["Push"],
  "Pull-Ups": ["Pull"],
  "Chin-Ups": ["Pull"],
  "Australian Pull-Ups (Dip Bars)": ["Pull"],
  "Bicep Rows (Dip Bars)": ["Pull"],
  "Ice Cream Makers": ["Pull", "Front Lever"],
  "Sissy Squats": ["Legs"],
  "Calf Raises": ["Legs"],
  "Side-Lying Leg Raises": ["Legs"],
  "Cossack Squats": ["Legs"],
  "Prone Leg Curls (Single-Leg)": ["Legs"],
  "Standing Leg Curls": ["Legs"],
  Handstand: ["Handstand"],
  "Handstand Push-Ups": ["Push", "Handstand"],
  "Press to Handstand": ["Handstand"],
  "Pike Push-Ups": ["Push", "Handstand"],
  "One Arm Handstand": ["Handstand"],
  "Front Lever (Tuck)": ["Front Lever"],
  "Front Lever (Advanced Tuck)": ["Front Lever"],
  "Front Lever (Straddle)": ["Front Lever"],
  "Front Lever (Full)": ["Front Lever"],
  "Front Lever Raises": ["Front Lever"],
  "Back Lever (Tuck)": ["Back Lever"],
  "Back Lever (Advanced Tuck)": ["Back Lever"],
  "Back Lever (Full)": ["Back Lever"],
  "Muscle Up": ["Pull", "Push"],
  "Planche (Tuck)": ["Planche"],
  "Planche (Advanced Tuck)": ["Planche"],
  "Planche (Straddle)": ["Planche"],
  "Planche (Full)": ["Planche"],
  "L-Sit": ["L-Sit"],
  "L-Sit (Straddle)": ["L-Sit"],
  "L-Sit (Compressed)": ["L-Sit"],
  "Seated Alternating Leg Raises (L-Sit Prep)": ["L-Sit"],
};

// Gives a user their own copy of the standard groups, with the standard
// exercises filed into them the same way everyone starts out — a one-time
// starting point, not kept in sync afterward. Safe to call more than once
// for the same user (reuses existing groups by name, skips memberships that
// already exist), so it can also backfill users who registered before this
// existed.
export async function applyStandardGrouping(userId: string) {
  const ownGroups = await db.select().from(exerciseGroups).where(eq(exerciseGroups.userId, userId));
  const groupIdByLowerName = new Map(ownGroups.map((g) => [g.name.toLowerCase(), g.id]));

  const groupIdByName: Record<string, string> = {};
  for (const groupName of STANDARD_GROUP_NAMES) {
    const existingId = groupIdByLowerName.get(groupName.toLowerCase());
    if (existingId) {
      groupIdByName[groupName] = existingId;
      continue;
    }

    const [created] = await db.insert(exerciseGroups).values({ userId, name: groupName }).returning();
    groupIdByName[groupName] = created.id;
  }

  const standardExercises = await db.select().from(exercises).where(isNull(exercises.userId));
  const standardIdByLowerName = new Map(standardExercises.map((e) => [e.name.toLowerCase(), e.id]));

  const memberRows: { exerciseId: string; groupId: string }[] = [];
  for (const [exerciseName, groupNames] of Object.entries(STANDARD_EXERCISE_GROUPS)) {
    const exerciseId = standardIdByLowerName.get(exerciseName.toLowerCase());
    if (!exerciseId) continue; // catalog doesn't have this one (yet)

    for (const groupName of groupNames) {
      const groupId = groupIdByName[groupName];
      if (groupId) memberRows.push({ exerciseId, groupId });
    }
  }

  if (memberRows.length > 0) {
    await db.insert(exerciseGroupMembers).values(memberRows).onConflictDoNothing();
  }
}
