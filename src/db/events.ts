import type { TableName } from './schema';

// Tiny change bus: writes call notifyChanged, query hooks re-run when one of their tables changes.

type Listener = (tables: ReadonlySet<TableName>) => void;

const listeners = new Set<Listener>();
let batchDepth = 0;
const pending = new Set<TableName>();

export function onTablesChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyChanged(...tables: TableName[]): void {
  if (batchDepth > 0) {
    for (const t of tables) pending.add(t);
    return;
  }
  const changed = new Set(tables);
  for (const listener of listeners) listener(changed);
}

/** Runs `task` and emits one combined change notification at the end (for bulk writes like imports). */
export async function batchChanges<T>(task: () => Promise<T>): Promise<T> {
  batchDepth++;
  try {
    return await task();
  } finally {
    batchDepth--;
    if (batchDepth === 0 && pending.size > 0) {
      const tables = [...pending];
      pending.clear();
      notifyChanged(...tables);
    }
  }
}
