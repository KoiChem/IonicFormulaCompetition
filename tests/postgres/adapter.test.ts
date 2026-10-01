import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { PostgresDatabase, postgresQuery } from '../../src/platform/postgres-database';
let pg: PGlite;
beforeEach(async () => { pg = new PGlite(); });
afterEach(async () => { await pg.close(); });
describe('Postgres persistence compatibility', () => {
  it('uses bound parameters without substituting quoted question marks', () => {
    expect(postgresQuery("SELECT '?' AS literal, ? AS value")).toBe("SELECT '?' AS literal, $1 AS value");
  });
  it('rolls back the complete batch when a later statement fails', async () => {
    await pg.exec('CREATE TABLE samples(id text PRIMARY KEY)');
    const db = new PostgresDatabase((query, values) => pg.query(query, values));
    await expect(pg.transaction(async tx => {
      const transactional = new PostgresDatabase((query, values) => tx.query(query, values));
      await transactional.batch([transactional.prepare('INSERT INTO samples VALUES (?)').bind('a'), transactional.prepare('INSERT INTO samples VALUES (?)').bind('a')]);
    })).rejects.toThrow();
    expect(await db.prepare('SELECT count(*)::int AS count FROM samples').first()).toEqual({ count: 0 });
  });
  it('handles SQLite JSON extraction and scalar bounds in real Postgres', async () => {
    const db = new PostgresDatabase((query, values) => pg.query(query, values));
    const row = await db.prepare("SELECT json_extract(?, '$.rank') AS rank, MAX(0, ?) AS bounded").bind('{"rank":2}', -10).first();
    expect(row).toEqual({ rank: 2, bounded: 0 });
  });
});
