# Testing Plate on the iPhone

Do the one-time Supabase setup in the README first (e-mail template with `{{ .Token }}`, and the
`ANTHROPIC_API_KEY` secret for step 7). Then start the app (`npx expo start --tunnel`) and open it in Expo Go.

Tick each line. If something fails, note the step number and take a screenshot.

## 1. Sign in and onboarding
- [ ] Sign-in screen in your phone's language; Suomi/English switch at the bottom works.
- [ ] Enter your e-mail → **Send code** → a 6-digit code arrives by e-mail.
- [ ] iOS offers the code above the keyboard (or type it). It signs in automatically at 6 digits.
- [ ] Wrong code → "That code is wrong or has expired."
- [ ] Onboarding: language, kg/lb, body weight → calories and protein fill in automatically; edit them; **Start**.
- [ ] Close Expo Go completely and reopen → you are still signed in (no new code needed).

## 2. Home
- [ ] Today, the date, 0 kcal of your target, protein/carbs/fat, "No workout today", four meals.
- [ ] ← shows yesterday; tapping the title returns to today.
- [ ] Gear → Settings.

## 3. Workout (try it in airplane mode too)
- [ ] **Start workout** → **+ Add exercise** → search "penkki" or "bench" → pick Bench Press.
- [ ] Three sets appear. Tap the weight → big −/+ buttons step 2.5 kg; tap fast and no taps are lost.
- [ ] Changing set 1's weight also updates sets 2 and 3.
- [ ] Tap the ✓ → green, haptic tap, rest timer starts at the bottom (−15 / +15 / Skip).
- [ ] Lock the phone during the rest → a notification arrives when the rest ends (allow notifications when asked).
- [ ] **+ Add set** copies the last set; long-press a set → delete.
- [ ] ⋯ → Exercise settings (rep range) / Remove exercise.
- [ ] **Finish** → back on Home: workout card, and the target grew by the training-day bonus ("Training day +200 kcal").
- [ ] Next workout, add the same exercise → "Last time: …" and the same weights prefilled.
- [ ] If every set reached the top of the rep range last time → one increment heavier, with a green "↑" explanation.
- [ ] Settings → Workout history → the workout; open it; delete works.

## 4. Food
- [ ] **Log food** → the meal is preselected by time of day.
- [ ] Search "ruisleipä", "kananmuna", "maito" → Fineli results; tap one → amount, "1 kpl · 55 g" chips, macros update live → **Add**.
- [ ] Entry shows under the meal; tap it → change amount or meal, or delete.
- [ ] **Log food** again → Recent shows the food; the **+** logs the same portion with one tap.
- [ ] ☆ on the portion screen → appears under Favorites.
- [ ] **Scan** → allow camera → scan a product barcode (e.g. milk carton) → product found → portion → Add.
- [ ] Scan in airplane mode → "No connection…" → **Add manually** works.
- [ ] **New food** → create your own food with values per 100 g.
- [ ] Next day: "Same as yesterday" on an empty meal copies yesterday's meal.

## 5. Settings
- [ ] Change calorie/protein targets, carbs/fat (optional), training-day bonus → Home updates.
- [ ] kg ↔ lb switches all weights; the increment becomes 5 lb.
- [ ] Number keyboards have a **Done** button above them.
- [ ] Language switch changes the whole app.

## 6. Sync (needs a second device or a reinstall)
- [ ] Settings → Sync shows "Synced HH:MM" while online.
- [ ] Airplane mode → log food and a workout → still works; Sync says offline.
- [ ] Back online → within a minute Sync says synced.
- [ ] Sign out → sign in again with the same e-mail → everything comes back (and no onboarding again).
- [ ] Optional: sign in on a second phone/web → same data; edits on one appear on the other.

## 7. AI food logging (needs `ANTHROPIC_API_KEY`)
- [ ] Log food → **Describe** → type or dictate (🎤 on the keyboard) "kaksi kananmunaa, kaksi ruisleipää ja maitokahvi".
- [ ] **Estimate** → editable items (eggs, rye bread, coffee, milk) with amounts and kcal.
- [ ] Change an amount → kcal and macros scale; remove an item with ×.
- [ ] **Add n items** → they appear under the meal.
- [ ] Airplane mode → "No connection. Your text is kept…" (the text stays).

## 8. Import
- [ ] Settings → Import from other apps → follow the instructions for Hevy, Strong or MyFitnessPal.
- [ ] Pick the CSV (e.g. from the Files app) → preview counts → **Import** → history shows the workouts.
- [ ] Import the same file again → "0 imported, n already imported".
- [ ] If a real export file is rejected or looks wrong, send me its first few lines; the parsers are
      built from the apps' documented formats and may need a tweak for your file.

## 9. Your data
- [ ] Settings → Export → JSON / food CSV / workouts CSV → iOS share sheet → save to Files.
- [ ] Settings → Delete account (do this last) → confirm → you're back at sign-in; signing in again starts fresh.
