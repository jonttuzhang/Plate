import type { SqlDb } from './sql';

// Local SQLite migrations. Append only: never edit a migration that has shipped,
// add a new entry instead. PRAGMA user_version stores how many have been applied.

const syncColumns = `
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 1`;

export const migrations: string[] = [
  // 1: synced tables + sync bookkeeping
  `
  CREATE TABLE profiles (${syncColumns},
    language TEXT NOT NULL DEFAULT 'en',
    unit_system TEXT NOT NULL DEFAULT 'metric',
    weight_increment_kg REAL NOT NULL DEFAULT 2.5,
    body_weight_kg REAL,
    kcal_target INTEGER NOT NULL DEFAULT 2500,
    protein_target_g INTEGER NOT NULL DEFAULT 160,
    carbs_target_g INTEGER,
    fat_target_g INTEGER,
    training_bonus_kcal INTEGER NOT NULL DEFAULT 0,
    training_bonus_protein_g INTEGER NOT NULL DEFAULT 0,
    rest_seconds INTEGER NOT NULL DEFAULT 120,
    onboarded_at TEXT
  );

  CREATE TABLE exercises (${syncColumns},
    name TEXT NOT NULL,
    muscle_group TEXT,
    equipment TEXT,
    rep_min INTEGER NOT NULL DEFAULT 8,
    rep_max INTEGER NOT NULL DEFAULT 12,
    increment_kg REAL
  );

  CREATE TABLE workouts (${syncColumns},
    local_date TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    note TEXT
  );
  CREATE INDEX workouts_local_date ON workouts (local_date);

  CREATE TABLE workout_sets (${syncColumns},
    workout_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    exercise_position INTEGER NOT NULL,
    set_position INTEGER NOT NULL,
    weight_kg REAL NOT NULL,
    reps INTEGER NOT NULL,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT
  );
  CREATE INDEX workout_sets_workout ON workout_sets (workout_id);
  CREATE INDEX workout_sets_exercise ON workout_sets (exercise_id, completed_at);

  CREATE TABLE foods (${syncColumns},
    name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,
    kcal_100g REAL NOT NULL,
    protein_100g REAL NOT NULL,
    carbs_100g REAL NOT NULL,
    fat_100g REAL NOT NULL,
    serving_g REAL,
    source TEXT NOT NULL,
    source_ref TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    last_used_at TEXT
  );
  CREATE INDEX foods_barcode ON foods (barcode);
  CREATE INDEX foods_last_used ON foods (last_used_at);

  CREATE TABLE food_entries (${syncColumns},
    local_date TEXT NOT NULL,
    meal TEXT NOT NULL,
    food_id TEXT,
    name TEXT NOT NULL,
    grams REAL NOT NULL,
    kcal REAL NOT NULL,
    protein_g REAL NOT NULL,
    carbs_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    source TEXT NOT NULL,
    logged_at TEXT NOT NULL
  );
  CREATE INDEX food_entries_local_date ON food_entries (local_date, meal);

  CREATE TABLE sync_state (
    table_name TEXT PRIMARY KEY NOT NULL,
    last_pulled_at TEXT
  );
  `,

  // 2: local-only key/value metadata (e.g. which user owns this local database)
  `
  CREATE TABLE app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  `,

  // 3: read-only Fineli catalog (seeded from src/data/fineli.json, never synced)
  `
  CREATE TABLE fineli_foods (
    id INTEGER PRIMARY KEY NOT NULL,
    name_fi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    search TEXT NOT NULL,
    kcal REAL NOT NULL,
    protein REAL NOT NULL,
    carbs REAL NOT NULL,
    fat REAL NOT NULL,
    serving_g REAL,
    serving_unit TEXT
  );
  `,
];

/** Applies pending migrations, each in its own transaction. Returns the resulting schema version. */
export async function migrate(db: SqlDb): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  let version = row?.user_version ?? 0;
  while (version < migrations.length) {
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migrations[version]!);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
  return version;
}
