# Plate

Workout logging and calorie/macro tracking in one fast, minimal app. Expo (SDK 58) + expo-sqlite
(offline-first) + Supabase (auth, Postgres with RLS, Edge Functions). Finnish and English.

## Run on your iPhone (Expo Go)

You need **Node.js** and **Git** on your computer and **Expo Go** (latest, SDK 58) on the iPhone.

```bash
git clone https://github.com/jonttuzhang/Plate.git
cd Plate
npm install
```

Create `.env` in the `Plate` folder (both values are public):

```
EXPO_PUBLIC_SUPABASE_URL=https://sxuedbjvrsbbpjlmquzi.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_XgYwMHzTWqPpxsvnsh9VDA_rYSMjJGK
```

Start and scan the QR code with the iPhone Camera:

```bash
npx expo start --tunnel
```

(`npm start` also works when phone and computer are on the same Wi-Fi.) Later: `git pull`, `npm install`, start again.

What to test: see [TESTING.md](TESTING.md).

## One-time Supabase setup (dashboard)

The database, RLS policies and Edge Functions are already deployed. Three settings can only be changed
in the dashboard (https://supabase.com/dashboard/project/sxuedbjvrsbbpjlmquzi):

1. **Sign-in code e-mails.** Authentication → Emails → Templates. In both **Magic Link** and
   **Confirm sign up**, replace the body with something like:
   ```html
   <h2>Your Plate code</h2>
   <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
   ```
   And check Authentication → Sign In / Providers → Email: **Email OTP Length = 6**.
2. **AI food logging.** Edge Functions → Secrets → add `ANTHROPIC_API_KEY` (from console.anthropic.com).
   Optional: `AI_DAILY_LIMIT` (default 30 requests per user per day).
3. **Before other people use the app:** Supabase's built-in e-mail only delivers to your own
   team's addresses and is heavily rate-limited. Set up custom SMTP (e.g. Resend) under
   Authentication → Emails → SMTP Settings.

## Development

```bash
npm run check     # TypeScript (strict) + 105 Jest tests
npm run web       # web target for quick UI checks
```

Conventions, architecture and data rules: [CLAUDE.md](CLAUDE.md).

In development builds the sign-in screen has **"Developer: continue without account"**: a local-only
mode with no sync and placeholder AI estimates, for UI work. It doesn't exist in production builds.

### Edge Functions

`supabase/functions/delete-account` and `supabase/functions/parse-food` (Deno). They are deployed with
`verify_jwt = false` and check the user's token themselves (`_shared/http.ts`). Deploy with the
Supabase MCP server or the CLI (`supabase functions deploy <name> --no-verify-jwt`).

## Database

Migrations live in `supabase/migrations/` and are applied to the hosted project (Supabase MCP, or paste
into Dashboard → SQL Editor in filename order). Every table has `user_id` and RLS `auth.uid() = user_id`;
clients can't hard-delete (soft deletes sync like any change); deleting the auth user cascades to all data.

## Food data

- **Fineli** (Finnish Institute for Health and Welfare, THL), CC BY 4.0. The bundled seed is Release 18,
  taken from an unmodified mirror of the official package because fineli.fi blocks scripted downloads.
  To update to the newest release: download the "basic package" zip from https://fineli.fi/fineli/en/avoin-data,
  extract it, then run `node scripts/build-fineli.mjs <extracted-folder> "Release NN"`. The app re-seeds automatically.
- **Open Food Facts** (ODbL) for barcode lookups.

## Privacy

Basic logging is free. No data is sold, no ad tracking. Export everything (JSON/CSV) or delete the
account and all data from Settings.
