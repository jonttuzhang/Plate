# Plate

Gym workout logging and calorie/macro tracking in one fast, minimal iPhone app.
Built with Expo (runs in Expo Go), SQLite on the phone and Supabase in the cloud.

## Run it on your iPhone (Windows)

1. Install [Node.js LTS](https://nodejs.org) and, on the iPhone, **Expo Go** from the App Store.
2. In the project folder:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in the Supabase URL and publishable key.
4. Start the dev server:
   ```bash
   npm start
   ```
5. Scan the QR code with the iPhone Camera; it opens in Expo Go. The phone and the PC must be on the
   same Wi-Fi. If it does not connect, use `npx expo start --tunnel`.

For a quick look in a browser: `npm run web`.

## Checks

```bash
npm run check
```

Runs the TypeScript compiler and the tests.

## Supabase

SQL migrations are in `supabase/migrations/` and are already applied to the project. To apply them to
another project, run the files in order in the dashboard's SQL Editor.

See `CLAUDE.md` for the architecture and conventions.
