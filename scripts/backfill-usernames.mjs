// One-off: fills in profiles.username for every account that predates
// real-email registration, deriving it from that account's current
// synthetic email (the only place the username used to live). Deliberately
// does NOT touch auth.users.email — leaving it as the synthetic address is
// exactly what makes the proxy force each of these accounts through
// /verify-email on their next login (see src/proxy.ts). Also sets
// user_metadata.username via the admin API so the eventual verification/
// recovery emails can greet them by name.
// Usage: node scripts/backfill-usernames.mjs
import { config } from "dotenv";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const sql = postgres(process.env.DIRECT_URL, { prepare: false });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function emailToUsername(email) {
  return email.replace(/@setisfaction\.local$/, "");
}

async function main() {
  // LEFT JOIN, not JOIN — some accounts predate the profiles table/insert
  // logic entirely and have no row there at all, not just a null username.
  const rows = await sql`
    select u.id as user_id, u.email, p.username
    from auth.users u
    left join profiles p on p.user_id = u.id
    where p.username is null
  `;

  if (rows.length === 0) {
    console.log("Nothing to backfill — every account already has a username.");
    return;
  }

  for (const row of rows) {
    if (!row.email.endsWith("@setisfaction.local")) {
      console.log(`Skipping ${row.user_id} — email ${row.email} isn't the old synthetic form, backfill wouldn't be safe to guess.`);
      continue;
    }

    const username = emailToUsername(row.email);
    await sql`
      insert into profiles (user_id, username) values (${row.user_id}, ${username})
      on conflict (user_id) do update set username = ${username}
    `;

    const { error } = await admin.auth.admin.updateUserById(row.user_id, { user_metadata: { username } });
    if (error) {
      console.error(`Failed to set user_metadata for ${username}:`, error.message);
      continue;
    }

    console.log(`${username} — profiles.username set. Will be prompted to add a real email on next login.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
