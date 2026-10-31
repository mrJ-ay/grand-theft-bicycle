/* =========================================================
   GRAND THEFT BICYCLE — Database Module (Neon Postgres)
   - vegas-slots ns_players (카지노 잔고) 및 ns_ledger (원장) 직접 연동
   ========================================================= */
import pg from 'pg';

pg.types.setTypeParser(20, v => Number(v)); // BIGINT -> number
pg.types.setTypeParser(1700, v => parseFloat(v)); // NUMERIC -> number

let pool = null;
let dbAvailable = false;

if (process.env.DATABASE_URL) {
  try {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on('error', e => console.error('[DB] Postgres Pool Error:', e.message));
  } catch (err) {
    console.warn('[DB] Failed to init pool:', err.message);
  }
}

// 로컬 게스트/오프라인 인메모리 폴백
const memPlayers = new Map();

export async function q(text, params = []) {
  if (!pool) throw new Error('Database pool not initialized');
  return pool.query(text, params);
}

export async function initSchema() {
  if (!pool) {
    console.log('[DB] DATABASE_URL 없음. 인메모리 게스트 모드로 동작합니다.');
    return;
  }

  try {
    await pool.query('SELECT 1');
    dbAvailable = true;
    console.log('[DB] Neon Postgres 연결 성공. vegas-slots ns_players 잔고 연동 활성화!');

    // ns_players 및 ns_ledger 보장
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ns_players (
        id               TEXT PRIMARY KEY,
        name             TEXT NOT NULL,
        balance          BIGINT NOT NULL DEFAULT 100000 CHECK (balance >= 0),
        credit           INTEGER NOT NULL DEFAULT 500,
        spins            INTEGER NOT NULL DEFAULT 0,
        bankruptcies     INTEGER NOT NULL DEFAULT 0,
        last_bankrupt_at TIMESTAMPTZ,
        npc_blacklist    TEXT[] NOT NULL DEFAULT '{}',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen        TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS ns_ledger (
        id            BIGSERIAL PRIMARY KEY,
        player_id     TEXT NOT NULL,
        delta         BIGINT NOT NULL,
        balance_after BIGINT NOT NULL,
        reason        TEXT NOT NULL,
        ref           TEXT,
        at            TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS ns_ledger_player_idx ON ns_ledger (player_id, at DESC);
    `);
  } catch (err) {
    console.warn('[DB] DB 연결 실패, 인메모리 모드로 전환:', err.message);
    dbAvailable = false;
  }
}

export function isDbAvailable() {
  return dbAvailable;
}

export async function getPlayer(id, name = '익명의도둑') {
  if (!dbAvailable || !pool) {
    if (!memPlayers.has(id)) {
      memPlayers.set(id, { id, name, balance: 1000000, credit: 500 });
    }
    return memPlayers.get(id);
  }

  try {
    const { rows } = await pool.query('SELECT * FROM ns_players WHERE id = $1', [id]);
    if (rows.length) return rows[0];

    // 신규 생성
    const { rows: inserted } = await pool.query(
      `INSERT INTO ns_players (id, name, balance) VALUES ($1, $2, 1000000)
       ON CONFLICT (id) DO UPDATE SET last_seen = now()
       RETURNING *`,
      [id, name]
    );
    return inserted[0];
  } catch (err) {
    console.error('[DB] getPlayer Error:', err.message);
    if (!memPlayers.has(id)) {
      memPlayers.set(id, { id, name, balance: 1000000, credit: 500 });
    }
    return memPlayers.get(id);
  }
}

export async function adjustBalance(id, delta, reason, ref = null) {
  delta = Math.round(delta);

  if (!dbAvailable || !pool) {
    const p = await getPlayer(id);
    p.balance = Math.max(0, p.balance + delta);
    return p.balance;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE ns_players 
       SET balance = GREATEST(0, balance + $2), last_seen = now() 
       WHERE id = $1 
       RETURNING balance`,
      [id, delta]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      throw new Error(`Player ${id} not found`);
    }

    const newBalance = rows[0].balance;
    await client.query(
      `INSERT INTO ns_ledger (player_id, delta, balance_after, reason, ref) 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, delta, newBalance, reason, ref]
    );

    await client.query('COMMIT');
    return newBalance;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
