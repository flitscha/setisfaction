# setisfaction
A simple workout tracker for logging sets and tracking progress.

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Needs `.env.local` set up first (copy `.env.example` and fill in the Supabase values) — see `CLAUDE.md` for the architecture details.

Other useful scripts:

- `npm run seed [username]` — replaces one existing user's exercises/groups/sets with a realistic dev training history. Never run against real data you want to keep.
- `npm run create-test-users` — creates (or reuses) a fixed set of test accounts, `user1`/`user2`/`user3`, password `123455`, for trying out the friend/community features without touching real accounts. `user1` and `user2` come pre-friended with seeded training history; `user3` has no relationships yet, so you can test sending/accepting a friend request. Needs the dev server running first.
- `npm run set-admin -- <username> [true|false]` — promotes/demotes a user to admin.

Database schema changes go through Drizzle migrations: `npx drizzle-kit generate` (review the generated SQL) then `npx drizzle-kit migrate`.
