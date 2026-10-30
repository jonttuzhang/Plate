import { useEffect, useRef, useState } from 'react';

import { onTablesChanged } from './events';
import type { TableName } from './schema';

/**
 * Runs an async query and re-runs it whenever one of `tables` changes (or `deps` change).
 * Returns undefined until the first result arrives.
 */
export function useQuery<T>(tables: TableName[], query: () => Promise<T>, deps: unknown[]): T | undefined {
  const [data, setData] = useState<T>();
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    let active = true;
    const run = () => {
      queryRef.current().then(
        (result) => active && setData(result),
        (error: unknown) => console.warn('useQuery failed', error),
      );
    };
    run();
    const unsubscribe = onTablesChanged((changed) => {
      if (tables.some((t) => changed.has(t))) run();
    });
    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(','), ...deps]);

  return data;
}
