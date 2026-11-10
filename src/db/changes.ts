import type { TableName } from './schema';

/**
 * Tiny pub/sub that makes the UI reactive: `write.ts` announces which tables changed and
 * `useQuery` re-runs the queries that read them.
 */
type Listener = (tables: ReadonlySet<TableName>) => void;

const listeners = new Set<Listener>();

export function subscribeToChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyChanged(...tables: TableName[]): void {
  const changed = new Set(tables);
  for (const listener of [...listeners]) listener(changed);
}
