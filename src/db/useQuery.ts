import { useEffect, useRef, useState } from 'react';

import { subscribeToChanges } from './changes';
import { getDb, type Database } from './index';
import type { TableName } from './schema';

export interface QueryState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

/**
 * Runs a read against the local database and re-runs it whenever one of `tables` is written.
 * `deps` works like in `useEffect` (values the query closes over).
 */
export function useQuery<T>(
  tables: readonly TableName[],
  query: (db: Database) => Promise<T>,
  deps: readonly unknown[] = [],
): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ data: undefined, error: undefined, loading: true });
  const queryRef = useRef(query);
  queryRef.current = query;
  const tableKey = tables.join(',');

  useEffect(() => {
    let active = true;
    let run = 0;
    const execute = async () => {
      const mine = ++run;
      try {
        const data = await queryRef.current(await getDb());
        // Ignore results that were overtaken by a newer run or an unmount.
        if (active && mine === run) setState({ data, error: undefined, loading: false });
      } catch (e) {
        if (active && mine === run) setState({ data: undefined, error: e as Error, loading: false });
      }
    };
    void execute();
    const watched = tableKey.split(',');
    const unsubscribe = subscribeToChanges((changed) => {
      if (watched.some((t) => changed.has(t as TableName))) void execute();
    });
    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, ...deps]);

  return state;
}
