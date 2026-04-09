# Daily Throwdown

A daily rock-paper-scissors elimination tournament app with an AI host, spectator broadcast mode, streak rewards, and company-funded cash prizes.

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS 4
- Supabase (auth + database)

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. In Supabase, open the SQL editor and run:

- `supabase-schema.sql`

That creates the first-pass tables for:
- profiles
- streaks
- tournaments
- entries
- matches
- throws
- match_games

## What’s wired already

- Supabase client helper: `src/lib/supabase.ts`
- SQL schema source: `src/lib/schema.ts`
- SQL file for copy/paste: `supabase-schema.sql`
- Auth setup panel on the home page: `src/components/auth-gate.tsx`

If env vars are missing, the app shows setup instructions.
If env vars exist, the app shows a magic-link sign-in form.

## Recommended next backend steps

1. Add row-level security policies
2. Auto-create `profiles` rows from auth users
3. Persist tournament entry from the Lobby page
4. Persist match throws from the Match page
5. Load Broadcast / Results / Profile from live data
6. Add a scheduled daily tournament creator for 2:00 PM Central

## Notes

This project is currently a polished frontend prototype with early backend scaffolding. The Supabase integration added here is the foundation, not the finished backend.
