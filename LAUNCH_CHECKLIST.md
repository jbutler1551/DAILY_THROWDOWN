# Daily Throwdown — Launch Checklist

## SQL Migrations (run in order)
1. `supabase-schema.sql` — Base tables
2. `supabase-migration-sprint1.sql` — Profile columns + RLS
3. `supabase-migration-sprint2.sql` — pg_cron + streak trigger
4. `supabase-migration-sprint3.sql` — Bracket gen + resolution + timeouts
5. `supabase-migration-sprint5.sql` — Stats finalization trigger
6. `supabase-migration-sprint6.sql` — Push notification triggers

## Edge Functions (deploy)
```bash
supabase functions deploy submit-move
supabase functions deploy send-push
```

## Supabase Dashboard Config
- [ ] Enable Realtime on tables: `matches`, `match_games`, `entries`, `tournaments`
- [ ] Verify pg_cron extension is enabled
- [ ] Verify pg_net extension is enabled (for push notification HTTP calls)
- [ ] Set `app.settings.supabase_url` and `app.settings.service_role_key` in Postgres config (for pg_cron → Edge Function calls)

## Security Audit
- [ ] RLS on all 7 tables (profiles, streaks, tournaments, entries, matches, throws, match_games)
- [ ] `throws` read policy: opponent moves hidden until `match_games` row exists
- [ ] `throws` insert policy: can only insert for own `entry_id`
- [ ] `entries` insert policy: can only insert for own `profile_id`
- [ ] `matches/tournaments/match_games`: no write policies for anon/authenticated (service-role only)
- [ ] Edge Function validates JWT, match liveness, participant check, duplicate prevention
- [ ] Move timeout cannot be exploited (pg_cron runs server-side, not client-triggered)
- [ ] No client-side match resolution (resolveThrow/randomMove removed from match screen)
- [ ] Verify: user cannot submit move for another user's entry
- [ ] Verify: user cannot read opponent's unresolved throw

## Edge Cases Handled
- [x] 0 entrants → tournament auto-cancelled
- [x] 1 entrant → auto-win, tournament completed
- [x] Odd player count → house match with random pre-generated throw
- [x] 5 consecutive ties → dual advance (both players move on)
- [x] Dual advance creating odd next-round count → handled by generate_round pairing
- [x] Player reconnects mid-match → match.tsx fetches current match state from DB
- [x] Best-of-3 series tracking for final 4 players
- [x] Move timeout → auto-forfeit after 60 seconds via pg_cron
- [x] Both players time out → random resolution
- [x] Streak reset on missed day, increment on consecutive day
- [x] Same-day re-entry → streak trigger ignores duplicate

## EAS Build
```bash
cd mobile
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

## App Store Prep
- [ ] Privacy policy URL (add to app.json `expo.ios.privacyManifests`)
- [ ] App Store screenshots (5.5", 6.5", 6.7")
- [ ] App description + keywords
- [ ] Age rating (12+ for gambling-adjacent due to cash prizes)
- [ ] Apple Developer account ($99/yr)
- [ ] Google Play Developer account ($25 one-time)

## Monitoring
- [ ] Supabase Dashboard → Edge Function logs
- [ ] pg_cron job monitoring (check `cron.job_run_details`)
- [ ] Set up alerts for Edge Function error rates
- [ ] Monitor `matches` table for stuck `live` matches (indicates resolution bug)

## Load Test
Run `scripts/load-test.sql` and verify:
- [ ] 2000 players → bracket generates in <5 seconds
- [ ] Exactly 1 champion at end
- [ ] No deadlocks
- [ ] Round count is ~11 (log2(2000) ≈ 11)
- [ ] All matches completed, no stuck `live` matches
