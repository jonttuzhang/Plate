import type { SqlDriver } from './driver';

/**
 * Local SQLite migrations. APPEND ONLY: never edit a migration that has shipped, add a new one.
 * The version is stored in `PRAGMA user_version`. `schema.test.ts` checks that running all of
 * them produces exactly the tables and columns declared in `schema.ts`.
 */

const SYNC_COLUMNS = `
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 1`;

export const migrations: string[] = [
  // 1: initial schema
  `
  CREATE TABLE profiles (
    id TEXT PRIMARY KEY NOT NULL,
    units TEXT NOT NULL,
    body_weight_kg REAL,
    kcal_target REAL NOT NULL,
    protein_target_g REAL NOT NULL,
    carbs_target_g REAL,
    fat_target_g REAL,
    training_bonus_kcal REAL NOT NULL,
    training_bonus_protein_g REAL NOT NULL,
    weight_increment_kg REAL NOT NULL,
    onboarded_at TEXT,${SYNC_COLUMNS}
  );

  CREATE TABLE exercises (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    muscle_group TEXT,
    rep_min INTEGER NOT NULL,
    rep_max INTEGER NOT NULL,
    increment_kg REAL,${SYNC_COLUMNS}
  );

  CREATE TABLE workouts (
    id TEXT PRIMARY KEY NOT NULL,
    day TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    note TEXT,${SYNC_COLUMNS}
  );
  CREATE INDEX workouts_day ON workouts (day);

  CREATE TABLE workout_sets (
    id TEXT PRIMARY KEY NOT NULL,
    workout_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    exercise_order INTEGER NOT NULL,
    set_order INTEGER NOT NULL,
    weight_kg REAL NOT NULL,
    reps INTEGER NOT NULL,
    completed_at TEXT,${SYNC_COLUMNS}
  );
  CREATE INDEX workout_sets_workout ON workout_sets (workout_id);
  CREATE INDEX workout_sets_exercise ON workout_sets (exercise_id, completed_at);

  CREATE TABLE foods (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,
    source TEXT NOT NULL,
    source_ref TEXT,
    kcal_100g REAL NOT NULL,
    protein_100g REAL NOT NULL,
    carbs_100g REAL NOT NULL,
    fat_100g REAL NOT NULL,
    serving_g REAL,
    serving_label TEXT,
    favorited_at TEXT,
    last_used_at TEXT,${SYNC_COLUMNS}
  );
  CREATE INDEX foods_barcode ON foods (barcode);

  CREATE TABLE food_entries (
    id TEXT PRIMARY KEY NOT NULL,
    day TEXT NOT NULL,
    meal TEXT NOT NULL,
    food_id TEXT,
    name TEXT NOT NULL,
    amount_g REAL NOT NULL,
    kcal REAL NOT NULL,
    protein_g REAL NOT NULL,
    carbs_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    logged_at TEXT NOT NULL,${SYNC_COLUMNS}
  );
  CREATE INDEX food_entries_day ON food_entries (day);

  CREATE TABLE local_state (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export async function getSchemaVersion(driver: SqlDriver): Promise<number> {
  const rows = await driver.all('PRAGMA user_version', []);
  return Number(rows[0]?.user_version ?? 0);
}

/** Brings the database up to date. Each migration runs in its own transaction. */
export async function migrate(driver: SqlDriver): Promise<number> {
  let version = await getSchemaVersion(driver);
  while (version < migrations.length) {
    const sql = migrations[version]!;
    version += 1;
    await driver.exec('BEGIN');
    try {
      await driver.exec(sql);
      await driver.exec(`PRAGMA user_version = ${version}`);
      await driver.exec('COMMIT');
    } catch (e) {
      await driver.exec('ROLLBACK');
      throw e;
    }
  }
  return version;
}
