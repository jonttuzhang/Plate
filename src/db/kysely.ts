import {
  CompiledQuery,
  Kysely,
  SelectQueryNode,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type QueryResult,
} from 'kysely';

import type { SqlDriver, SqlValue } from './driver';
import type { DB } from './schema';

export type Database = Kysely<DB>;

/** Builds the typed query builder on top of any `SqlDriver`. */
export function createDatabase(driver: SqlDriver): Database {
  return new Kysely<DB>({ dialect: new SqlDriverDialect(driver) });
}

class SqlDriverDialect implements Dialect {
  constructor(private readonly driver: SqlDriver) {}
  createAdapter = () => new SqliteAdapter();
  createDriver = () => new KyselyDriver(this.driver);
  createIntrospector = (db: Kysely<unknown>) => new SqliteIntrospector(db);
  createQueryCompiler = () => new SqliteQueryCompiler();
}

/**
 * There is one SQLite connection, so queries are serialized with a simple promise queue.
 * Without it, a query issued while a transaction is open would run inside that transaction.
 */
class KyselyDriver implements Driver {
  private readonly connection: DatabaseConnection;
  private tail: Promise<void> = Promise.resolve();
  private release: (() => void) | undefined;

  constructor(private readonly driver: SqlDriver) {
    this.connection = new Connection(driver);
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<DatabaseConnection> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => (release = resolve));
    await previous;
    this.release = release;
    return this.connection;
  }

  async releaseConnection(): Promise<void> {
    this.release?.();
    this.release = undefined;
  }

  beginTransaction = () => this.driver.exec('BEGIN');
  commitTransaction = () => this.driver.exec('COMMIT');
  rollbackTransaction = () => this.driver.exec('ROLLBACK');
  async destroy(): Promise<void> {}
}

class Connection implements DatabaseConnection {
  constructor(private readonly driver: SqlDriver) {}

  async executeQuery<R>(query: CompiledQuery): Promise<QueryResult<R>> {
    const params = query.parameters as SqlValue[];
    if (returnsRows(query)) {
      return { rows: (await this.driver.all(query.sql, params)) as R[] };
    }
    const { changes } = await this.driver.run(query.sql, params);
    return { rows: [], numAffectedRows: BigInt(changes) };
  }

  // eslint-disable-next-line require-yield
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error('Streaming is not supported');
  }
}

function returnsRows(query: CompiledQuery): boolean {
  if (SelectQueryNode.is(query.query)) return true;
  return /^\s*(select|with|pragma)\b/i.test(query.sql) || /\breturning\b/i.test(query.sql);
}
