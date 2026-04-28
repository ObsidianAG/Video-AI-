import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = resolve(HERE, '..', 'migrations');

export interface MigrationFile {
  readonly id: string;
  readonly filename: string;
  readonly sql: string;
}

export const listMigrations = (): readonly MigrationFile[] => {
  const entries = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.sql'))
    .map((d) => d.name)
    .sort();

  return entries.map((filename) => {
    const id = filename.replace(/\.sql$/, '');
    const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8');
    return { id, filename, sql };
  });
};
