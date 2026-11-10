# Plate

Gym workout logging + calorie/macro tracking in one fast, minimal iPhone app.
**Speed is the product:** logging a set or a meal must take as few taps as possible.

## Hard constraints
- Must run in **Expo Go** (QR code) on iPhone. No custom dev builds, no native modules outside Expo Go.
  Before adding a dependency, confirm it is in `node_modules/expo/bundledNativeModules.json` or is pure JS.
  If a feature needs a dev build (e.g. Apple Health), say so and propose an Expo Go alternative.
- Expo SDK 58 (Expo Go on the App Store only runs the latest SDK). Install with `npx expo install <pkg>`
  (in the cloud container: `EXPO_OFFLINE=1 npx expo install <pkg>`, because api.expo.dev is blocked there).
- The web target must keep working for quick UI checks (`npm run web`).
- Never put a service role key, secret key or AI API key in the app. Only `EXPO_PUBLIC_SUPABASE_URL` and the
  publishable key (`EXPO_PUBLIC_SUPABASE_ANON_KEY`). Secrets live in Supabase secrets, used by Edge Functions.

## Commands
```bash
npm start            # Expo dev server (scan QR with iPhone Camera → Expo Go)
npm run web          # web target
npm run typecheck    # tsc --noEmit (strict)
npm test             # jest
npm run check        # both; run before every commit
```

## Layout
- `src/app/` Expo Router routes only: each file re-exports a screen from `src/features`.
- `src/features/<feature>/` screens, queries and pure logic of one feature together
  (`home`, `settings`; later `auth`, `workout`, `food`, `sync`, `import`). Pure logic must have unit tests.
- `src/db/` the local database (shared by all features):
  - `schema.ts` THE definition of every table; row types and the Kysely `DB` type derive from it.
  - `migrations.ts` append-only SQL, versioned by `PRAGMA user_version`.
  - `driver.ts` minimal `SqlDriver` interface; `expoDriver.ts` (phone/web) and `testing/sqljsDriver.ts` (tests).
  - `kysely.ts` typed query builder (Kysely) over a `SqlDriver`. `index.ts` → `getDb()`.
  - `write.ts` all writes to synced tables. `changes.ts` + `useQuery.ts` make reads reactive.
- `src/i18n/` `en.ts` is the source of truth; `fi.ts` must match its shape (type-checked and tested).
- `src/theme/tokens.ts` all colors, spacing, type, radii, tap sizes. No raw values in screens.
- `src/ui/` small primitives (Text, Button, Card, ListRow, Screen).
- `src/lib/` ids, dates, Supabase client.
- `supabase/migrations/` SQL, applied via the Supabase MCP server.

## Data and sync rules
- Offline-first: the UI only reads and writes local SQLite. The network is never on the critical path.
- Every synced table has `id` (client UUID via `newId()`), `created_at`, `updated_at`, `deleted_at`;
  locally also `dirty`; on Supabase also `user_id` and `server_seq`.
- Write synced tables **only** via `insertRow` / `updateRow` / `softDeleteRow` (they set `updated_at`
  and `dirty` and notify listeners). Never hard-delete synced rows; every read filters `deleted_at IS NULL`.
- Reads use Kysely (`db.selectFrom(...)`), wrapped in `useQuery([tables], (db) => ...)` in screens.
- Server (`sync_before_write` trigger on every table): last write wins on `updated_at`; every accepted
  write gets the next `server_seq`; writes are serialized per user (advisory lock) so `server_seq` order
  equals commit order. Devices pull "rows with `server_seq` > my cursor" (M6).
- RLS on every table: `(select auth.uid()) = user_id` for select/insert/update. No DELETE grant.
- `profiles.id` = the user's id. Built-in exercises will have fixed UUIDs in code; a row in `exercises`
  with the same id is the user's override.
- Days are local calendar dates as `'YYYY-MM-DD'` text (`localDate()`), never derived from UTC timestamps.
- Timestamps are ISO 8601 UTC text. Weights in kg, energy in kcal, macros in grams; convert only at display.
- Food entries snapshot their macros (editing a food never rewrites history).
- New synced table or column = new local migration + new Supabase migration + `schema.ts`.
  `schema.test.ts` fails if they drift.
- Use only the **async** expo-sqlite API (the sync API needs SharedArrayBuffer on web).
- Language is a device preference (AsyncStorage), not synced.

## Design principles
- Apple-inspired, sparse, calm. One main screen (Home = today). No tab bar. Very few buttons.
- Large tap targets: `tap.primary` (56pt) for logging actions, `tap.min` (44pt) everywhere else.
  One-handed use between sets: primary actions sit at the bottom (`Screen` `footer`).
- Dark only in V1 (`palettes` is keyed by scheme so light can be added later).
- Finnish + English for every user-visible string (`t('...')`), no hard-coded UI text.
  Plurals: write `'1 set|{n} sets'` and pass `{ n }`.
- Metric by default (kg, 2.5 kg increment, configurable).
- No social features, no gamification, no ads, no tracking.

## Code style
- TypeScript strict. Simple, readable code, few dependencies; explain non-obvious decisions in a short comment.
- Tests needed for: sync logic, progression rule, macro totals, CSV parsing, AI response parsing.

## Browser checks (cloud container)
- `CI=1 EXPO_OFFLINE=1 npx expo start --web`, then Playwright at 390x844. CI=1 disables file watching,
  so restart the server after edits. supabase.co is not reachable from the container.

## Supabase
- Project: `Plate` (ref `sxuedbjvrsbbpjlmquzi`, eu-north-1).
- Edge Functions `delete-account` and `parse-food` from the first build are still deployed and stale;
  they are replaced in M2 and M8.

## Milestones
1. ✅ Setup, navigation, tokens, i18n, SQLite schema, Supabase schema + RLS
2. Auth (email OTP), onboarding, sign out, delete account, data export
3. Workout logging (offline)
4. Food logging: search, Fineli seed, barcode, favorites
5. Home + training-day targets
6. Sync engine (`sync_push` / `sync_pull` Postgres functions, one request each)
7. Progression suggestion
8. AI text food logging (Edge Function + Claude)
9. CSV import (Hevy, Strong, MyFitnessPal)
10. Polish

Out of scope for V1: Apple Health, Watch app, social, payments. Keep the data layer clean for them.
