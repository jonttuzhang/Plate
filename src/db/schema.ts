/**
 * The single definition of the local database.
 *
 * Everything else is derived from or checked against this file:
 *  - TypeScript row types and the Kysely `DB` type (compile time)
 *  - the list of synced tables/columns used by the sync engine
 *  - `schema.test.ts` fails if the local migrations or the Supabase migrations drift from it
 */

type SqlType = 'text' | 'real' | 'integer';

interface Column<T> {
  sql: SqlType;
  nullable: boolean;
  /** Type-only marker, never set at runtime. */
  readonly __type?: T;
}

const text = <T extends string = string>(): Column<T> => ({ sql: 'text', nullable: false });
const real = (): Column<number> => ({ sql: 'real', nullable: false });
const integer = (): Column<number> => ({ sql: 'integer', nullable: false });
const nullable = <T>(c: Column<T>): Column<T | null> => ({ sql: c.sql, nullable: true });

/** Columns every synced table has. `dirty` exists only locally (1 = not yet pushed). */
const syncColumns = {
  created_at: text(),
  updated_at: text(),
  deleted_at: nullable(text()),
  dirty: integer(),
};

const synced = <C extends Record<string, Column<unknown>>>(columns: C) => ({
  ...columns,
  ...syncColumns,
});

export type Units = 'metric' | 'imperial';
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodSource = 'custom' | 'fineli' | 'off' | 'ai' | 'import';

/**
 * Synced tables, parents before children (the sync engine pushes in this order).
 * Conventions: ids are client UUIDs, timestamps are ISO 8601 UTC text, days are local
 * 'YYYY-MM-DD' text, weights are kg, energy is kcal, macros are grams.
 */
export const syncedTables = {
  /** One row per user; `id` is the user's id. */
  profiles: synced({
    id: text(),
    units: text<Units>(),
    body_weight_kg: nullable(real()),
    kcal_target: real(),
    protein_target_g: real(),
    carbs_target_g: nullable(real()),
    fat_target_g: nullable(real()),
    training_bonus_kcal: real(),
    training_bonus_protein_g: real(),
    weight_increment_kg: real(),
    onboarded_at: nullable(text()),
  }),
  /** Custom exercises, and per-user overrides of built-in ones (same id as the built-in). */
  exercises: synced({
    id: text(),
    name: text(),
    muscle_group: nullable(text()),
    rep_min: integer(),
    rep_max: integer(),
    increment_kg: nullable(real()),
  }),
  workouts: synced({
    id: text(),
    day: text(),
    started_at: text(),
    ended_at: nullable(text()),
    note: nullable(text()),
  }),
  workout_sets: synced({
    id: text(),
    workout_id: text(),
    exercise_id: text(),
    exercise_order: integer(),
    set_order: integer(),
    weight_kg: real(),
    reps: integer(),
    completed_at: nullable(text()),
  }),
  /** The user's personal food list (anything they have logged, scanned or created). */
  foods: synced({
    id: text(),
    name: text(),
    brand: nullable(text()),
    barcode: nullable(text()),
    source: text<FoodSource>(),
    source_ref: nullable(text()),
    kcal_100g: real(),
    protein_100g: real(),
    carbs_100g: real(),
    fat_100g: real(),
    serving_g: nullable(real()),
    serving_label: nullable(text()),
    favorited_at: nullable(text()),
    last_used_at: nullable(text()),
  }),
  /** A logged portion. Macros are a snapshot, so editing a food never rewrites history. */
  food_entries: synced({
    id: text(),
    day: text(),
    meal: text<Meal>(),
    food_id: nullable(text()),
    name: text(),
    amount_g: real(),
    kcal: real(),
    protein_g: real(),
    carbs_g: real(),
    fat_g: real(),
    logged_at: text(),
  }),
};

/** Tables that never leave the device. */
export const localTables = {
  /** Small key/value store for device state such as the sync cursor. */
  local_state: {
    key: text(),
    value: text(),
  },
};

export const allTables = { ...syncedTables, ...localTables };

export type SyncedTable = keyof typeof syncedTables;
export type TableName = keyof typeof allTables;
export const syncedTableNames = Object.keys(syncedTables) as SyncedTable[];

type RowOf<C> = { [K in keyof C]: C[K] extends Column<infer T> ? T : never };

/** The Kysely database type. */
export type DB = { [T in TableName]: RowOf<(typeof allTables)[T]> };
export type Row<T extends TableName> = DB[T];

/** Columns managed by `write.ts`; callers never set them. */
export type SyncColumn = keyof typeof syncColumns;
/** What a caller passes to `insertRow`: everything except the sync columns, `id` optional. */
export type NewRow<T extends SyncedTable> = Omit<Row<T>, SyncColumn | 'id'> & { id?: string };
export type RowPatch<T extends SyncedTable> = Partial<Omit<Row<T>, SyncColumn | 'id'>>;

/** Column name → `{ sql, nullable }`, for the drift test and the sync engine. */
export function columnsOf(table: TableName): Record<string, { sql: SqlType; nullable: boolean }> {
  return allTables[table];
}
