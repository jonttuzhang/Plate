# Plate

Workout logging and calorie/macro tracking in one fast, minimal app. Built with Expo (SDK 58),
expo-sqlite (offline-first) and Supabase.

## Run on your iPhone (Expo Go)

1. Install/update **Expo Go** from the App Store (it must support SDK 58).
2. On your computer (Node 20+):
   ```bash
   git clone https://github.com/jonttuzhang/Plate.git
   cd Plate
   npm install
   copy .env.example .env      # Windows (macOS/Linux: cp)
   ```
   Fill in `.env` with the project URL and **publishable** key (Supabase dashboard → Project Settings → API).
3. `npm start`, then scan the QR code with the iPhone Camera app. Phone and PC must be on the same Wi-Fi;
   otherwise use `npx expo start --tunnel`.

Web (quick UI checks): `npm run web`.

## Development
```bash
npm run check   # typecheck + tests
```
Conventions, architecture and data rules: see [CLAUDE.md](CLAUDE.md).

## Database
SQL migrations live in `supabase/migrations/` and are applied to the hosted project
(via the Supabase MCP server, or by pasting into Dashboard → SQL Editor in filename order).

## Food data
- **Fineli** (Finnish Institute for Health and Welfare, THL), CC BY 4.0. The bundled seed is Release 18,
  taken from an unmodified mirror of the official package because fineli.fi blocks scripted downloads.
  To update to the newest release: download the "basic package" zip from https://fineli.fi/fineli/en/avoin-data,
  extract it, then run `node scripts/build-fineli.mjs <extracted-folder> "Release NN"`. The app re-seeds automatically.
- **Open Food Facts** (ODbL) for barcode lookups.

## Privacy
Basic logging is free. No data is sold, no ad tracking.
