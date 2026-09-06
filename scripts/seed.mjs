// Dev-only seed script: ensures the shared exercise catalog (user_id null,
// visible to everyone) has the full curated list, then replaces one user's
// own groups/sets with ~3 weeks of realistic training history against it.
// Usage: node scripts/seed.mjs [username]  (defaults to "felix")
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const username = process.argv[2] ?? "felix";
const email = `${username.trim().toLowerCase()}@setisfaction.local`;

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const EXERCISES = [
  {
    name: "Push-Ups",
    groups: ["Push"],
    tracksReps: true,
    tracksTime: false,
    description: "Standard push-up: hands shoulder-width, body in a straight line from head to heels.",
    repBase: 15,
    repProgressionPerWeek: 2,
  },
  {
    name: "Push-Ups (Deep, Parallettes)",
    groups: ["Push"],
    tracksReps: true,
    tracksTime: false,
    description: "Push-ups with hands on parallettes/bars for extra range of motion below hand level.",
    repBase: 10,
    repProgressionPerWeek: 1,
  },
  {
    name: "Dips",
    groups: ["Push"],
    tracksReps: true,
    tracksTime: false,
    description: "Parallel bar dips: lower until upper arms are roughly parallel to the ground, then press back up.",
    repBase: 8,
    repProgressionPerWeek: 1,
  },
  {
    name: "Diamond Push-Ups",
    groups: ["Push"],
    tracksReps: true,
    tracksTime: false,
    description: "Push-ups with hands close together, thumbs and index fingers touching, forming a diamond shape.",
    repBase: 8,
    repProgressionPerWeek: 1,
  },
  {
    name: "Lateral Raises",
    groups: ["Push"],
    tracksReps: true,
    tracksTime: false,
    description: "Raise both arms out to the sides until roughly shoulder height, then lower with control.",
    repBase: 12,
    repProgressionPerWeek: 1,
  },
  {
    name: "Pull-Ups",
    groups: ["Pull"],
    tracksReps: true,
    tracksTime: false,
    description: "Overhand grip, pull chin above the bar.",
    repBase: 6,
    repProgressionPerWeek: 1,
  },
  {
    name: "Chin-Ups",
    groups: ["Pull"],
    tracksReps: true,
    tracksTime: false,
    description: "Underhand grip, pull chin above the bar.",
    repBase: 7,
    repProgressionPerWeek: 1,
  },
  {
    name: "Australian Pull-Ups (Dip Bars)",
    groups: ["Pull"],
    tracksReps: true,
    tracksTime: false,
    description:
      "Wide/neutral grip on low dip bars, body inclined with feet on the ground — pull your chest up toward the bars, then lower with control.",
    repBase: 10,
    repProgressionPerWeek: 1,
  },
  {
    name: "Bicep Rows (Dip Bars)",
    groups: ["Pull"],
    tracksReps: true,
    tracksTime: false,
    description:
      "Like Australian Pull-Ups, but with a chin-up (underhand, shoulder-width) grip on the same low dip bars — shifts more emphasis onto the biceps.",
    repBase: 9,
    repProgressionPerWeek: 1,
  },
  {
    name: "Ice Cream Makers",
    groups: ["Pull", "Front Lever"],
    tracksReps: true,
    tracksTime: false,
    description:
      "Start in a tucked front lever, pull up into the top pull-up position, then lower back down under control — combines front lever and pull-up strength.",
    repBase: 6,
    repProgressionPerWeek: 1,
  },
  {
    name: "Sissy Squats",
    groups: ["Legs"],
    tracksReps: true,
    tracksTime: false,
    description: "Bodyweight squat leaning back onto the toes, knees traveling forward, emphasizing the quads.",
    repBase: 8,
    repProgressionPerWeek: 1,
  },
  {
    name: "Calf Raises",
    groups: ["Legs"],
    tracksReps: true,
    tracksTime: false,
    description: "Rise onto the balls of the feet, then lower with control.",
    repBase: 20,
    repProgressionPerWeek: 2,
  },
  {
    name: "Side-Lying Leg Raises",
    groups: ["Legs"],
    tracksReps: true,
    tracksTime: false,
    description: "Lying on your side, lift the top leg straight up and lower with control — targets the hip abductors.",
    repBase: 12,
    repProgressionPerWeek: 1,
  },
  {
    name: "Cossack Squats",
    groups: ["Legs"],
    tracksReps: true,
    tracksTime: false,
    description:
      "Wide stance; shift your weight down onto one bent leg while the other stays straight out to the side, then pull yourself back up using support (rings/bar) rather than pressing — targets the inner thighs.",
    repBase: 8,
    repProgressionPerWeek: 1,
  },
  {
    name: "Prone Leg Curls (Single-Leg)",
    groups: ["Legs"],
    tracksReps: true,
    tracksTime: false,
    description:
      "Lying face down, curl one heel up toward your glutes, then lower with control — targets the hamstrings. Train each side separately.",
    repBase: 10,
    repProgressionPerWeek: 1,
  },
  {
    name: "Standing Leg Curls",
    groups: ["Legs"],
    tracksReps: true,
    tracksTime: false,
    description:
      "Standing on one leg, curl the other heel back and up toward your glutes, then lower with control — targets the hamstrings. Train each side separately.",
    repBase: 10,
    repProgressionPerWeek: 1,
  },
  {
    name: "Handstand",
    groups: ["Handstand"],
    tracksReps: false,
    tracksTime: true,
    description: "Freestanding or wall-assisted handstand hold.",
    timeBase: 15,
    timeProgressionPerWeek: 3,
  },
  {
    name: "Handstand Push-Ups",
    groups: ["Push", "Handstand"],
    tracksReps: true,
    tracksTime: false,
    description: "Push-up performed in a handstand (freestanding or against a wall): lower the head toward the ground, then press back up.",
    repBase: 4,
    repProgressionPerWeek: 1,
  },
  {
    name: "Press to Handstand",
    groups: ["Handstand"],
    tracksReps: true,
    tracksTime: false,
    description: "Press up into a handstand from a tucked or straddled position on the ground, without kicking up.",
    repBase: 3,
    repProgressionPerWeek: 1,
  },
  {
    name: "Pike Push-Ups",
    groups: ["Push", "Handstand"],
    tracksReps: true,
    tracksTime: false,
    description:
      "Push-up with hips raised high (an inverted V shape), hands and feet on the ground — builds the shoulder-pressing strength used in a handstand push-up.",
    repBase: 10,
    repProgressionPerWeek: 1,
  },
  {
    name: "One Arm Handstand",
    groups: ["Handstand"],
    tracksReps: false,
    tracksTime: true,
    description: "Freestanding handstand balanced on a single arm — a very advanced handstand progression.",
    timeBase: 2,
    timeProgressionPerWeek: 1,
  },
  {
    name: "Front Lever (Tuck)",
    groups: ["Front Lever"],
    tracksReps: false,
    tracksTime: true,
    description: "Hanging front lever with knees tucked to the chest — the easiest front lever progression.",
    timeBase: 8,
    timeProgressionPerWeek: 2,
  },
  {
    name: "Front Lever (Advanced Tuck)",
    groups: ["Front Lever"],
    tracksReps: false,
    tracksTime: true,
    description: "Front lever with legs mostly straight (advanced tuck, straddle, or full, depending on level).",
    timeBase: 5,
    timeProgressionPerWeek: 1,
  },
  {
    name: "Front Lever (Straddle)",
    groups: ["Front Lever"],
    tracksReps: false,
    tracksTime: true,
    description: "Front lever with legs straight and spread wide to shorten the lever arm — easier than a full front lever.",
    timeBase: 6,
    timeProgressionPerWeek: 1,
  },
  {
    name: "Front Lever (Full)",
    groups: ["Front Lever"],
    tracksReps: false,
    tracksTime: true,
    description: "Front lever with legs straight and together, body fully horizontal — the most advanced front lever progression.",
    timeBase: 3,
    timeProgressionPerWeek: 1,
  },
  {
    name: "Front Lever Raises",
    groups: ["Front Lever"],
    tracksReps: true,
    tracksTime: false,
    description: "From a dead hang, raise the body up toward a front lever position and lower back down under control — builds front lever strength dynamically.",
    repBase: 5,
    repProgressionPerWeek: 1,
  },
  {
    name: "Back Lever (Tuck)",
    groups: ["Back Lever"],
    tracksReps: false,
    tracksTime: true,
    description: "Hanging back lever with knees tucked to the chest — the easiest back lever progression.",
    timeBase: 8,
    timeProgressionPerWeek: 2,
  },
  {
    name: "Back Lever (Advanced Tuck)",
    groups: ["Back Lever"],
    tracksReps: false,
    tracksTime: true,
    description: "Back lever with the hips extended further than the tuck, knees still bent, body more horizontal.",
    timeBase: 5,
    timeProgressionPerWeek: 1,
  },
  {
    name: "Back Lever (Full)",
    groups: ["Back Lever"],
    tracksReps: false,
    tracksTime: true,
    description: "Back lever with legs straight and together, body fully horizontal — the most advanced back lever progression.",
    timeBase: 3,
    timeProgressionPerWeek: 1,
  },
  {
    name: "Muscle Up",
    groups: ["Pull", "Push"],
    tracksReps: true,
    tracksTime: false,
    description: "Pull-up transitioning over the bar into a dip lockout — combines a pull-up and a dip in one continuous movement.",
    repBase: 3,
    repProgressionPerWeek: 1,
  },
  {
    name: "Planche (Tuck)",
    groups: ["Planche"],
    tracksReps: false,
    tracksTime: true,
    description: "Support hold with knees tucked to the chest, hips and shoulders low, feet off the ground — the easiest planche progression.",
    timeBase: 8,
    timeProgressionPerWeek: 2,
  },
  {
    name: "Planche (Advanced Tuck)",
    groups: ["Planche"],
    tracksReps: false,
    tracksTime: true,
    description: "Planche with the hips extended further than the tuck, knees still bent, body more horizontal.",
    timeBase: 5,
    timeProgressionPerWeek: 1,
  },
  {
    name: "Planche (Straddle)",
    groups: ["Planche"],
    tracksReps: false,
    tracksTime: true,
    description: "Planche with legs straight and spread wide to shorten the lever arm — easier than a full planche.",
    timeBase: 3,
    timeProgressionPerWeek: 1,
  },
  {
    name: "Planche (Full)",
    groups: ["Planche"],
    tracksReps: false,
    tracksTime: true,
    description: "Planche with legs straight and together, body fully horizontal — the most advanced planche progression.",
    timeBase: 2,
    timeProgressionPerWeek: 1,
  },
  {
    name: "L-Sit",
    groups: ["L-Sit"],
    tracksReps: false,
    tracksTime: true,
    description: "Support hold with legs extended straight out in front, hips flexed to roughly 90 degrees.",
    timeBase: 12,
    timeProgressionPerWeek: 2,
  },
  {
    name: "L-Sit (Straddle)",
    groups: ["L-Sit"],
    tracksReps: false,
    tracksTime: true,
    description:
      "L-sit with the legs spread wide to the sides instead of held together — reduces the hip-flexor demand compared to a regular L-sit.",
    timeBase: 15,
    timeProgressionPerWeek: 2,
  },
  {
    name: "L-Sit (Compressed)",
    groups: ["L-Sit"],
    tracksReps: false,
    tracksTime: true,
    description:
      "L-sit with the torso leaned forward over the hands instead of upright — shifts more load onto the shoulders.",
    timeBase: 8,
    timeProgressionPerWeek: 1,
  },
  {
    name: "Seated Alternating Leg Raises (L-Sit Prep)",
    groups: ["L-Sit"],
    tracksReps: true,
    tracksTime: false,
    description:
      "Sitting on the ground, hands beside hips, alternately lift each straight leg — trains the hip flexors used in the L-sit.",
    repBase: 10,
    repProgressionPerWeek: 1,
  },
];

const GROUPS = ["Push", "Pull", "Legs", "Handstand", "Front Lever", "Back Lever", "L-Sit", "Planche"];

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

async function main() {
  const [user] = await sql`select id from auth.users where email = ${email}`;
  if (!user) {
    throw new Error(`No auth.users row for ${email}. Create the user in the Supabase dashboard first.`);
  }
  const userId = user.id;
  console.log(`Seeding data for ${email} (${userId})`);

  // Resets this user's own data — never touches the shared catalog (user_id
  // is null there) or other users' groups/sets. Deleting their groups first
  // cascades any exercise_group_members rows for them (whether those linked
  // a shared or a personal exercise).
  await sql`delete from sets where user_id = ${userId}`;
  await sql`delete from exercise_groups where user_id = ${userId}`;
  await sql`delete from exercises where user_id = ${userId}`;

  // Ensures the shared catalog has every curated exercise — idempotent, so
  // running this for a second user reuses the same rows instead of
  // duplicating them (that's the point: everyone sees the same standard list).
  const exerciseIdByName = {};
  for (const def of EXERCISES) {
    const [existing] = await sql`select id from exercises where user_id is null and lower(name) = lower(${def.name})`;
    if (existing) {
      exerciseIdByName[def.name] = existing.id;
      continue;
    }
    const [exercise] = await sql`
      insert into exercises (user_id, name, description, tracks_reps, tracks_time, tracks_weight)
      values (null, ${def.name}, ${def.description}, ${def.tracksReps}, ${def.tracksTime}, false)
      returning id
    `;
    exerciseIdByName[def.name] = exercise.id;
  }

  const groupIdByName = {};
  for (const name of GROUPS) {
    const [group] = await sql`insert into exercise_groups (user_id, name) values (${userId}, ${name}) returning id`;
    groupIdByName[name] = group.id;
  }

  for (const def of EXERCISES) {
    for (const groupName of def.groups) {
      await sql`
        insert into exercise_group_members (exercise_id, group_id)
        values (${exerciseIdByName[def.name]}, ${groupIdByName[groupName]})
      `;
    }
  }

  // 9 sessions (3 weeks x 3/week) on Mon/Wed/Fri, ending on the most recent one at or before today.
  const TRAINING_WEEKDAYS = [1, 3, 5];
  const dates = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (dates.length < 9) {
    if (TRAINING_WEEKDAYS.includes(cursor.getDay())) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  dates.reverse();

  const byGroup = Object.fromEntries(
    ["Push", "Pull", "Legs"].map((group) => [group, EXERCISES.filter((e) => e.groups.includes(group)).map((e) => e.name)]),
  );
  const rotation = ["Push", "Pull", "Legs"];
  const skillPool = ["Front Lever (Tuck)", "L-Sit", "Front Lever (Advanced Tuck)"];

  const rows = [];

  dates.forEach((date, sessionIndex) => {
    const weekIndex = Math.floor(sessionIndex / 3);
    const primaryGroup = rotation[sessionIndex % rotation.length];
    const candidates = byGroup[primaryGroup];
    const chosenNames = [0, 1, 2].map((offset) => candidates[(sessionIndex + offset) % candidates.length]);
    const skillNames = ["Handstand", skillPool[sessionIndex % skillPool.length]];

    for (const name of [...chosenNames, ...skillNames]) {
      const def = EXERCISES.find((e) => e.name === name);
      const setCount = randomInt(3, 4);

      for (let setIndex = 0; setIndex < setCount; setIndex++) {
        const performedAt = new Date(date);
        performedAt.setHours(18 + randomInt(0, 1), randomInt(0, 45) + setIndex * 3, 0, 0);

        let reps = null;
        let timeSeconds = null;

        if (def.tracksReps) {
          const fatigue = setIndex * randomInt(1, 2);
          reps = Math.max(3, Math.round(def.repBase + weekIndex * def.repProgressionPerWeek - fatigue + randomInt(-1, 1)));
        }
        if (def.tracksTime) {
          const fatigue = setIndex * randomInt(1, 3);
          timeSeconds = Math.max(
            3,
            Math.round(def.timeBase + weekIndex * def.timeProgressionPerWeek - fatigue + randomInt(-2, 2)),
          );
        }

        rows.push({ exerciseId: exerciseIdByName[name], performedAt, reps, timeSeconds });
      }
    }
  });

  for (const row of rows) {
    await sql`
      insert into sets (user_id, exercise_id, performed_at, reps, time_seconds)
      values (${userId}, ${row.exerciseId}, ${row.performedAt.toISOString()}, ${row.reps}, ${row.timeSeconds})
    `;
  }

  console.log(
    `Catalog has ${EXERCISES.length} exercises. Created ${GROUPS.length} groups and ${rows.length} sets across ${dates.length} sessions.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
