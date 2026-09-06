// Dev-only: ensures a fixed set of test accounts exist with a known
// password, so friend/community features can be tested repeatably without
// touching real accounts. Created directly via the Supabase admin API
// (not the real public registration flow, which now requires reading a
// confirmation code out of an actual inbox) with an @setisfaction.test
// email — not @setisfaction.local, so the proxy's forced /verify-email
// detour (see src/proxy.ts) never applies to these; they're meant to stay
// fast and frictionless to log into. Also seeds user1/user2 with realistic
// training history and friends them with each other, leaving user3
// unfriended, so both the "already friends" and "pending request" states
// are ready to test out of the box.
// Usage: node scripts/create-test-users.mjs
import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const USERNAMES = ["user1", "user2", "user3"];
const PASSWORD = "123455";

const sql = postgres(process.env.DIRECT_URL, { prepare: false });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function testEmail(username) {
  return `${username}@setisfaction.test`;
}

async function ensureUser(username) {
  const email = testEmail(username);

  // Self-heal an account still on the old synthetic email — either created
  // by an older version of this script, or backfilled by
  // scripts/backfill-usernames.mjs (which only ever sets profiles.username,
  // deliberately never touches auth.users.email — see that script). Checked
  // before the "already exists" short-circuit below, since a backfilled
  // test account already has profiles.username set but still needs this.
  const legacyEmail = `${username}@setisfaction.local`;
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const legacy = existingUsers.users.find((u) => u.email === legacyEmail);
  if (legacy) {
    await admin.auth.admin.updateUserById(legacy.id, { email, email_confirm: true, user_metadata: { username } });
    await sql`
      insert into profiles (user_id, username) values (${legacy.id}, ${username})
      on conflict (user_id) do update set username = ${username}
    `;
    console.log(`${username} migrated from the old synthetic email`);
    return legacy.id;
  }

  const [existingProfile] = await sql`select user_id from profiles where lower(username) = lower(${username})`;
  if (existingProfile) {
    console.log(`${username} already exists`);
    return existingProfile.user_id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) throw error;

  await sql`insert into profiles (user_id, username) values (${data.user.id}, ${username})`;
  console.log(`created ${username}`);
  return data.user.id;
}

async function ensureFriendship(userIdA, userIdB) {
  const [a, b] = userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
  await sql`
    insert into friendships (user_id_a, user_id_b) values (${a}, ${b})
    on conflict (user_id_a, user_id_b) do nothing
  `;
}

async function main() {
  if (!process.env.DIRECT_URL) {
    throw new Error("Missing DIRECT_URL — is .env.local set up?");
  }

  const idByUsername = {};
  for (const username of USERNAMES) {
    idByUsername[username] = await ensureUser(username);
  }

  console.log("\nSeeding training history for user1 and user2…");
  execFileSync("node", ["scripts/seed.mjs", "user1"], { stdio: "inherit" });
  execFileSync("node", ["scripts/seed.mjs", "user2"], { stdio: "inherit" });

  await ensureFriendship(idByUsername.user1, idByUsername.user2);
  console.log("user1 and user2 are friends; user3 has no relationships yet.");

  console.log(`\nDone. Log in with any of: ${USERNAMES.join(", ")} — password "${PASSWORD}"`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
