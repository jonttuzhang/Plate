import type { TableName } from './schema';

// Tiny change bus: writes call notifyChanged, query hooks re-run when one of their tables changes.

type Listener = (tables: ReadonlySet<TableName>) => void;

const listeners = new Set<Listener>();

export function onTablesChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyChanged(...tables: TableName[]): void {
  const changed = new Set(tables);
  for (const listener of listeners) listener(changed);
}
