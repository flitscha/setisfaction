// Grants or revokes admin status for an existing user.
// Usage: node scripts/set-admin.mjs <username> [true|false]  (defaults to true)
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const username = process.argv[2];
const isAdmin = (process.argv[3] ?? "true") === "true";

if (!username) {
  console.error("Usage: node scripts/set-admin.mjs <username> [true|false]");
  process.exit(1);
}

const email = `${username.trim().toLowerCase()}@setisfaction.local`;
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function main() {
  const [user] = await sql`select id from auth.users where email = ${email}`;
  if (!user) {
    throw new Error(`No auth.users row for ${email}.`);
  }

  await sql`
    insert into profiles (user_id, is_admin) values (${user.id}, ${isAdmin})
    on conflict (user_id) do update set is_admin = ${isAdmin}
  `;

  console.log(`${username} is now ${isAdmin ? "an admin" : "not an admin"}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
