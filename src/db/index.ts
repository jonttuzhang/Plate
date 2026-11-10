import { createDatabase, type Database } from './kysely';
import { openExpoDriver } from './expoDriver';
import { migrate } from './migrations';

export type { Database } from './kysely';

let opening: Promise<Database> | undefined;

/** Opens (once) and migrates the local database. Safe to call from anywhere, any number of times. */
export function getDb(): Promise<Database> {
  opening ??= (async () => {
    const driver = await openExpoDriver('plate.db');
    await migrate(driver);
    return createDatabase(driver);
  })();
  // Let a failed open be retried instead of caching the rejection forever.
  opening.catch(() => (opening = undefined));
  return opening;
}
