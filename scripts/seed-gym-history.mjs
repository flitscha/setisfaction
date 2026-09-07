// Dev-only: inserts ~3 weeks of realistic gym training history (reps +
// weight, progressive overload) for one user, against the standard gym
// catalog — for trying out the Stats page's Reps/Weight/Volume chart toggle
// without having to log dozens of sets by hand.
//
// Weight climbs every week while reps drift slightly down (plus a little
// within-session fatigue) — deliberately, so a reps-only or weight-only
// chart each tell a different, incomplete story and Volume (reps × weight)
// is the one that shows the full picture.
//
// Only deletes this user's own sets against the exercises listed below
// first (not their whole history), so it's safe to re-run.
// Usage: node scripts/seed-gym-history.mjs [username]  (defaults to "user3")
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const username = process.argv[2] ?? "user3";
const sql = postgres(process.env.DIRECT_URL, { prepare: false });

const EXERCISES = [
  { name: "Bench Press (Barbell)", group: "Push", startWeight: 50, weightStepPerWeek: 5, startReps: 10, repDriftPerWeek: -1 },
  { name: "Overhead Press (Barbell)", group: "Push", startWeight: 30, weightStepPerWeek: 2.5, startReps: 10, repDriftPerWeek: -1 },
  { name: "Barbell Row", group: "Pull", startWeight: 40, weightStepPerWeek: 5, startReps: 10, repDriftPerWeek: -1 },
  { name: "Deadlift (Barbell)", group: "Pull", startWeight: 60, weightStepPerWeek: 10, startReps: 6, repDriftPerWeek: -1 },
  { name: "Back Squat (Barbell)", group: "Legs", startWeight: 50, weightStepPerWeek: 5, startReps: 8, repDriftPerWeek: -1 },
];

const TRAINING_WEEKDAYS = [1, 3, 5]; // Mon/Wed/Fri
const SESSION_COUNT = 9; // 3 weeks x 3/week
const ROTATION = ["Push", "Pull", "Legs"];

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

async function main() {
  const [profile] = await sql`select user_id from profiles where lower(username) = lower(${username})`;
  if (!profile) {
    throw new Error(`No account found for username "${username}".`);
  }
  const userId = profile.user_id;
  console.log(`Seeding gym history for ${username} (${userId})`);

  const exerciseIdByName = {};
  for (const def of EXERCISES) {
    const [exercise] = await sql`select id from exercises where user_id is null and lower(name) = lower(${def.name})`;
    if (!exercise) {
      throw new Error(`"${def.name}" isn't in the standard catalog — run the gym-exercises migration first.`);
    }
    exerciseIdByName[def.name] = exercise.id;
  }

  await sql`
    delete from sets
    where user_id = ${userId} and exercise_id in ${sql(Object.values(exerciseIdByName))}
  `;

  const dates = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (dates.length < SESSION_COUNT) {
    if (TRAINING_WEEKDAYS.includes(cursor.getDay())) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  dates.reverse();

  const rows = [];

  dates.forEach((date, sessionIndex) => {
    const weekIndex = Math.floor(sessionIndex / 3);
    const groupToday = ROTATION[sessionIndex % ROTATION.length];
    const exercisesToday = EXERCISES.filter((e) => e.group === groupToday);

    for (const def of exercisesToday) {
      const setCount = randomInt(3, 4);
      const weight = Math.round((def.startWeight + weekIndex * def.weightStepPerWeek) * 2) / 2; // nearest 0.5kg

      for (let setIndex = 0; setIndex < setCount; setIndex++) {
        const performedAt = new Date(date);
        performedAt.setHours(18 + randomInt(0, 1), randomInt(0, 45) + setIndex * 5, 0, 0);

        const fatigue = setIndex; // one fewer rep per set within the session
        const reps = Math.max(
          3,
          Math.round(def.startReps + weekIndex * def.repDriftPerWeek - fatigue + randomInt(-1, 1)),
        );

        rows.push({ exerciseId: exerciseIdByName[def.name], performedAt, reps, weightKg: weight });
      }
    }
  });

  for (const row of rows) {
    await sql`
      insert into sets (user_id, exercise_id, performed_at, reps, weight_kg)
      values (${userId}, ${row.exerciseId}, ${row.performedAt.toISOString()}, ${row.reps}, ${row.weightKg})
    `;
  }

  console.log(`Inserted ${rows.length} sets across ${dates.length} sessions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
