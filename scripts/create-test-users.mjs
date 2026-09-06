// Dev-only: ensures a fixed set of test accounts exist with a known
// password, so friend/community features can be tested repeatably without
// touching real accounts. Uses the real registration endpoint (so profile +
// default groups are set up exactly like a real sign-up) — the dev server
// must be running locally first. Also seeds user1/user2 with realistic
// training history and friends them with each other, leaving user3
// unfriended, so both the "already friends" and "pending request" states
// are ready to test out of the box.
// Usage: node scripts/create-test-users.mjs
import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const USERNAMES = ["user1", "user2", "user3"];
const PASSWORD = "123455";
const BASE_URL = process.env.TEST_USERS_BASE_URL ?? "http://localhost:3000";

const sql = postgres(process.env.DIRECT_URL, { prepare: false });

async function ensureUser(username) {
  const email = `${username}@setisfaction.local`;
  const [existing] = await sql`select id from auth.users where email = ${email}`;
  if (existing) {
    console.log(`${username} already exists`);
    return existing.id;
  }

  const res = await fetch(`${BASE_URL}/api/trpc/auth.register?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { json: { username, password: PASSWORD } } }),
  });
  const data = await res.json();
  const result = data[0]?.result?.data?.json;
  if (!result?.success) {
    throw new Error(`Failed to create ${username}: ${JSON.stringify(data)}`);
  }
  console.log(`created ${username}`);

  const [created] = await sql`select id from auth.users where email = ${email}`;
  return created.id;
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
