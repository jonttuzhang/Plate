import { getDb } from './database';
import { getProfile } from './queries/day';
import type { Profile } from './types';
import { useQuery } from './useQuery';

/** undefined while loading, null when the user has no profile yet (before onboarding). */
export function useProfile(): Profile | null | undefined {
  return useQuery(['profiles'], () => getProfile(getDb()), []);
}
