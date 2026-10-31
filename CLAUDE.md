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
- `src/app/` Expo Router routes only: thin screens, no SQL or business logic.
- `src/db/` SQLite: `schema.ts` (synced table columns), `migrations.ts` (append-only), `write.ts`
  (all writes), `queries/` (reads), `useQuery` (re-runs on table changes), `testing/sqljs.ts`.
- `src/domain/` pure logic (macros, targets, progression, units). Must have unit tests.
- `src/sync/` sync engine (M6): one module, pure, tested against sql.js + a fake remote.
- `src/i18n/` `en.ts` is the source of truth; `fi.ts` must match its shape (type-checked).
- `src/theme/tokens.ts` all colors, spacing, type, radii, tap sizes. No raw hex values in screens.
- `src/ui/` small primitives (Text, Button, Card, ListRow, ProgressBar).
- `supabase/migrations/` SQL, applied via Supabase MCP. `supabase/functions/` Edge Functions (Deno).

## Data and sync rules
- Offline-first: the UI only reads and writes local SQLite. The network is never on the critical path.
- Every synced table has: `id` (client UUID via `newId()`), `created_at`, `updated_at`, `deleted_at`;
  locally also `dirty`; on Supabase also `user_id` and `server_updated_at` (set by trigger, used as pull cursor).
- Write synced tables **only** via `insertRow` / `updateRow` / `softDeleteRow` (they set `updated_at`
  and `dirty` and notify listeners). Never hard-delete synced rows; every read filters `deleted_at IS NULL`.
- Conflict rule: last write wins on `updated_at`, enforced server-side by the `sync_before_write` trigger.
- Local DB belongs to one signed-in user; `user_id` is added only when pushing. Sign-out wipes local data.
- Days are local calendar dates as `'YYYY-MM-DD'` text (`localDate()`), never derived from UTC timestamps.
- Weights are stored in kg, energy in kcal, macros in grams. Convert only at display time.
- Food entries snapshot their macros (editing a food never rewrites history).
- New synced table or column = new local migration + new Supabase migration + `schema.ts` + `types.ts`.
  `schema.test.ts` fails if they drift. Every Supabase table gets RLS: `(select auth.uid()) = user_id`.
- Use only the **async** expo-sqlite API (the sync API needs SharedArrayBuffer on web).

## Design principles
- Apple-inspired, sparse, calm. One main screen (Home = today). No tab bar. Very few buttons.
- Large tap targets: `tap.primary` (56pt) for logging actions, `tap.min` (44pt) everywhere else.
  One-handed use between sets: primary actions sit at the bottom.
- Dark only in V1 (tokens are structured to add light mode later).
- Finnish + English for every user-visible string (`t('...')`), no hard-coded UI text.
- Metric by default (kg, 2.5 kg increment, configurable).
- No social features, no gamification, no ads, no tracking.

## Code style
- TypeScript strict. Simple, readable code, few dependencies; explain non-obvious decisions in a short comment.
- Pure logic goes in `src/domain` / `src/sync` / `src/import` with tests; screens stay thin.
- Tests needed for: sync logic, progression rule, macro totals, CSV parsing, AI response parsing.

## Milestones
1. ✅ Setup, navigation, tokens, i18n, SQLite schema, Supabase project + migrations + RLS
2. ✅ Auth (email OTP), onboarding, sign out, delete account, data export
3. ✅ Workout logging (offline)
4. ✅ Food logging: search, Fineli seed, barcode, favorites
5. ✅ Home + training-day targets
6. ✅ Sync engine
7. Progression suggestion
8. AI text food logging (Edge Function + Claude)
9. CSV import (Hevy, Strong, MyFitnessPal)
10. Polish

## Sync (`src/sync`)
- `engine.ts`: pure push/pull over `RemoteStore`; tested with sql.js + `FakeRemote` (mirrors the server trigger).
  Push dirty rows (parents first) → rows the server skipped as stale are replaced by the server copy.
  Pull by `server_updated_at` cursor with a 60 s overlap; apply only if new or strictly newer (LWW).
- `index.ts`: triggers (sign-in, foreground, 3 s after edits, reconnect, every 60 s) + status for Settings.
  First sign-in on a new device waits up to 10 s for a pull so existing users skip onboarding.
- Sign-out: sync (≤8 s) → stop sync → wipe local data. Ownerless local rows are wiped on sign-in.

## Food
- `foods` = the user's personal food list (anything logged/scanned/created). Fineli foods become a personal
  food on first use (`source = 'fineli'`, `source_ref` = Fineli id). `food_entries` snapshot macros.
- Fineli catalog: `src/data/fineli.json` (generated by `scripts/build-fineli.mjs` from the official
  open-data package; CC BY 4.0, attribution on the About screen). Seeded into the local-only
  `fineli_foods` table on first launch / when the bundled release changes.
- Barcodes: Open Food Facts v2 API from the phone (`src/food/openFoodFacts.ts`), cached as a personal food.
- Search folds ä/ö/å (`foldForSearch`) so "jaatelo" finds "jäätelö".

## Workouts
- Built-in exercises live in `src/data/exercises.ts` with FIXED ids (never change/reuse). A row in
  `exercises` with a built-in id is the user's override (rep range, increment); other rows are custom exercises.
- Sets are prefilled from the last session via `planSets` (`src/domain/progression.ts`).
- Rest timer (`src/lib/restTimer.ts`) stores an end timestamp + schedules a local notification.

## Auth
- Email 6-digit OTP (`signInWithOtp` + `verifyOtp` type `email`). The dashboard email templates
  (Magic link + Confirm signup) must contain `{{ .Token }}`.
- Routing gate in `src/app/_layout.tsx`: signed out → `sign-in`, no onboarded profile → `onboarding`, else the app.
- `profiles.id` = the user's id (one profile row per user on every device).
- `__DEV__` only: "continue without account" on the sign-in screen (fixed local user id, no sync/AI).
  Used for browser checks in the cloud container, where supabase.co is not reachable.
- Edge Functions are deployed with `verify_jwt = false` and authorize in code (`_shared/http.ts`),
  because the platform JWT check does not understand the new publishable/secret keys.

## Supabase
- Project: `Plate` (ref `sxuedbjvrsbbpjlmquzi`, eu-north-1).
- Out of scope for V1: Apple Health, Watch app, social, payments. Keep the data layer clean for them.
