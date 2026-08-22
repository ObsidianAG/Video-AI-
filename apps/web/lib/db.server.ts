/**
 * PostgreSQL client — fail-closed.
 *
 * Reads DATABASE_URL from environment at call time. Any call to sql()
 * will throw ConfigurationError if the variable is absent, which API routes
 * translate to HTTP 503.
 *
 * Import only from server-side modules. Never re-export from a client component.
 */
import 'server-only';

import { ConfigurationError } from '@/lib/config.server';

// Lazy singleton — only resolved after the first sql call.
let _sql: Awaited<ReturnType<typeof createClient>> | null = null;

type PostgresClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (strings: TemplateStringsArray, ...values: any[]): Promise<any[]>;
  end(): Promise<void>;
};

async function createClient(): Promise<PostgresClient> {
  const url = process.env['DATABASE_URL'];
  if (!url || url.trim() === '') {
    throw new ConfigurationError(
      'DATABASE_URL is not set. Cannot open database connection.',
    );
  }

  // Dynamic import so the module can be loaded in environments where
  // "postgres" is not installed (build-time) without a hard crash.
  const { default: postgres } = await import('postgres').catch(() => {
    throw new ConfigurationError(
      '"postgres" package is not installed. Run: pnpm add postgres',
    );
  });

  return postgres(url.trim(), {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
    onnotice: () => undefined, // suppress NOTICE logs in production
  }) as unknown as PostgresClient;
}

/**
 * Returns the shared PostgreSQL client, creating it on first call.
 * Throws ConfigurationError if DATABASE_URL is not set.
 */
export async function getDb(): Promise<PostgresClient> {
  if (!_sql) {
    _sql = await createClient();
  }
  return _sql;
}

/** Closes the DB connection pool — call on graceful shutdown. */
export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end();
    _sql = null;
  }
}

/** Translates unknown errors into a human-readable message. */
export function dbErrorMessage(err: unknown): string {
  if (err instanceof ConfigurationError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Unknown database error';
}
