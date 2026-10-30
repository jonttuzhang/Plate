// Single description of the synced tables, shared by the write helpers, the sync engine and data export.
//
// Every synced table also has these columns:
//   local SQLite + Supabase: id (uuid, client-generated), created_at, updated_at, deleted_at
//   local only:              dirty (1 = changed locally, not yet pushed)
//   Supabase only:           user_id, server_updated_at (pull cursor, set by trigger)
//
// The local DB belongs to exactly one signed-in user, so user_id is added only when pushing.
// schema.test.ts checks this file against both the local and the Supabase migrations.

export type ColumnType = 'text' | 'uuid' | 'int' | 'real' | 'bool' | 'date' | 'timestamp';

export const syncedTables = {
  profiles: {
    language: 'text',
    unit_system: 'text',
    weight_increment_kg: 'real',
    body_weight_kg: 'real',
    kcal_target: 'int',
    protein_target_g: 'int',
    carbs_target_g: 'int',
    fat_target_g: 'int',
    training_bonus_kcal: 'int',
    training_bonus_protein_g: 'int',
    rest_seconds: 'int',
    onboarded_at: 'timestamp',
  },
  exercises: {
    name: 'text',
    muscle_group: 'text',
    equipment: 'text',
    rep_min: 'int',
    rep_max: 'int',
    increment_kg: 'real',
  },
  workouts: {
    local_date: 'date',
    started_at: 'timestamp',
    ended_at: 'timestamp',
    note: 'text',
  },
  workout_sets: {
    workout_id: 'uuid',
    exercise_id: 'uuid',
    exercise_position: 'int',
    set_position: 'int',
    weight_kg: 'real',
    reps: 'int',
    is_warmup: 'bool',
    completed_at: 'timestamp',
  },
  foods: {
    name: 'text',
    brand: 'text',
    barcode: 'text',
    kcal_100g: 'real',
    protein_100g: 'real',
    carbs_100g: 'real',
    fat_100g: 'real',
    serving_g: 'real',
    source: 'text',
    source_ref: 'text',
    is_favorite: 'bool',
    last_used_at: 'timestamp',
  },
  food_entries: {
    local_date: 'date',
    meal: 'text',
    food_id: 'uuid',
    name: 'text',
    grams: 'real',
    kcal: 'real',
    protein_g: 'real',
    carbs_g: 'real',
    fat_g: 'real',
    source: 'text',
    logged_at: 'timestamp',
  },
} as const satisfies Record<string, Record<string, ColumnType>>;

export type TableName = keyof typeof syncedTables;

/** Push order: parents before children. */
export const tableNames = Object.keys(syncedTables) as TableName[];

export const commonColumns = ['id', 'created_at', 'updated_at', 'deleted_at'] as const;

export function columnsOf(table: TableName): string[] {
  return [...commonColumns, ...Object.keys(syncedTables[table])];
}
