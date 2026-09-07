// One-off: files the new gym exercises into every existing user's own
// Push/Pull/Legs groups (see standard-groups.ts's STANDARD_EXERCISE_GROUPS).
// applyStandardGrouping only ever runs once, at registration — an account
// created before the gym catalog existed never got these memberships, so
// this backfills them directly. Safe to run more than once: reuses existing
// groups by name, and membership inserts are ON CONFLICT DO NOTHING.
// Usage: node scripts/backfill-gym-groups.mjs
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DIRECT_URL, { prepare: false });

// Kept in sync with standard-groups.ts's gym entries — update both when a
// gym exercise is added.
const GYM_EXERCISE_GROUPS = {
  "Bench Press (Barbell)": ["Push"],
  "Incline Bench Press (Barbell)": ["Push"],
  "Dumbbell Bench Press": ["Push"],
  "Chest Press (Machine)": ["Push"],
  "Cable Fly": ["Push"],
  "Overhead Press (Barbell)": ["Push"],
  "Dumbbell Shoulder Press": ["Push"],
  "Lateral Raises (Dumbbell)": ["Push"],
  "Tricep Pushdown (Cable)": ["Push"],
  "Skull Crushers (EZ-Bar)": ["Push"],
  "Deadlift (Barbell)": ["Pull"],
  "Barbell Row": ["Pull"],
  "Seated Cable Row": ["Pull"],
  "Lat Pulldown": ["Pull"],
  "T-Bar Row": ["Pull"],
  "Face Pull (Cable)": ["Pull"],
  "Bicep Curl (Barbell)": ["Pull"],
  "Bicep Curl (Dumbbell)": ["Pull"],
  "Hammer Curl (Dumbbell)": ["Pull"],
  "Back Squat (Barbell)": ["Legs"],
  "Front Squat (Barbell)": ["Legs"],
  "Romanian Deadlift (Barbell)": ["Legs"],
  "Leg Press (Machine)": ["Legs"],
  "Leg Extension (Machine)": ["Legs"],
  "Leg Curl (Machine)": ["Legs"],
  "Hip Thrust (Barbell)": ["Legs"],
  "Calf Raise (Machine)": ["Legs"],
};

async function main() {
  const users = await sql`select user_id from profiles`;
  const gymExercises = await sql`select id, name from exercises where user_id is null and category = 'gym'`;
  const exerciseIdByName = new Map(gymExercises.map((e) => [e.name, e.id]));

  let memberRowsInserted = 0;

  for (const { user_id: userId } of users) {
    const ownGroups = await sql`select id, name from exercise_groups where user_id = ${userId}`;
    const groupIdByLowerName = new Map(ownGroups.map((g) => [g.name.toLowerCase(), g.id]));

    const groupIdByName = {};
    for (const name of ["Push", "Pull", "Legs"]) {
      let id = groupIdByLowerName.get(name.toLowerCase());
      if (!id) {
        const [created] = await sql`insert into exercise_groups (user_id, name) values (${userId}, ${name}) returning id`;
        id = created.id;
      }
      groupIdByName[name] = id;
    }

    for (const [exerciseName, groupNames] of Object.entries(GYM_EXERCISE_GROUPS)) {
      const exerciseId = exerciseIdByName.get(exerciseName);
      if (!exerciseId) continue;

      for (const groupName of groupNames) {
        const groupId = groupIdByName[groupName];
        const result = await sql`
          insert into exercise_group_members (exercise_id, group_id)
          values (${exerciseId}, ${groupId})
          on conflict do nothing
        `;
        memberRowsInserted += result.count;
      }
    }
  }

  console.log(`Backfilled gym exercise groups for ${users.length} users (${memberRowsInserted} new membership rows).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
