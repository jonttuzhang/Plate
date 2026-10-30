// Row shapes as stored in SQLite. Booleans are 0/1, dates are 'YYYY-MM-DD', timestamps are ISO strings.

export type Bool = 0 | 1;

export type BaseRow = {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  dirty: Bool;
};

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodSource = 'fineli' | 'off' | 'custom' | 'ai' | 'import';
export type UnitSystem = 'metric' | 'imperial';

export type Profile = BaseRow & {
  language: 'fi' | 'en';
  unit_system: UnitSystem;
  weight_increment_kg: number;
  body_weight_kg: number | null;
  kcal_target: number;
  protein_target_g: number;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  training_bonus_kcal: number;
  training_bonus_protein_g: number;
  rest_seconds: number;
  onboarded_at: string | null;
};

export type Exercise = BaseRow & {
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  rep_min: number;
  rep_max: number;
  increment_kg: number | null;
};

export type Workout = BaseRow & {
  local_date: string;
  started_at: string;
  ended_at: string | null;
  note: string | null;
};

export type WorkoutSet = BaseRow & {
  workout_id: string;
  exercise_id: string;
  exercise_position: number;
  set_position: number;
  weight_kg: number;
  reps: number;
  is_warmup: Bool;
  completed_at: string | null;
};

export type Food = BaseRow & {
  name: string;
  brand: string | null;
  barcode: string | null;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  serving_g: number | null;
  source: FoodSource;
  source_ref: string | null;
  is_favorite: Bool;
  last_used_at: string | null;
};

export type FoodEntry = BaseRow & {
  local_date: string;
  meal: Meal;
  food_id: string | null;
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: FoodSource;
  logged_at: string;
};

export type RowOf = {
  profiles: Profile;
  exercises: Exercise;
  workouts: Workout;
  workout_sets: WorkoutSet;
  foods: Food;
  food_entries: FoodEntry;
};
