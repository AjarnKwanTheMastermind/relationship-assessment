import { Pool } from "pg";
import type { AuditResult } from "./quiz";

// Reuse one pool across hot reloads in development.
const globalForPool = globalThis as unknown as { pgPool?: Pool };

function getPool(): Pool {
  if (!globalForPool.pgPool) {
    globalForPool.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Serverless hosts run many short-lived copies, so each keeps few connections.
      max: 3,
      idleTimeoutMillis: 10_000,
      // Allows for a database that suspends when idle and has to wake up.
      connectionTimeoutMillis: 15_000,
    });
    // Without a listener, a dropped idle connection would crash the process.
    globalForPool.pgPool.on("error", (err) => console.error("Idle database connection error", err));
  }
  return globalForPool.pgPool;
}

export async function insertResponse(answers: number[], result: AuditResult): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO responses
       (answers, cat1_score, cat2_score, cat3_score, percent_score, band, safety_flag)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      answers,
      result.categories[0].score,
      result.categories[1].score,
      result.categories[2].score,
      result.percentScore,
      result.band,
      result.safetyFlag,
    ],
  );
  return rows[0].id;
}

export async function getAnswers(id: string): Promise<number[] | null> {
  const { rows } = await getPool().query<{ answers: number[] }>(
    "SELECT answers FROM responses WHERE id = $1",
    [id],
  );
  return rows[0]?.answers ?? null;
}

export type AdminStats = {
  total: number;
  averagePercent: number | null;
  critical: number;
  warning: number;
  safe: number;
  safetyFlagged: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const { rows } = await getPool().query(
    `SELECT count(*)::int AS total,
            round(avg(percent_score))::int AS "averagePercent",
            count(*) FILTER (WHERE band = 'critical')::int AS critical,
            count(*) FILTER (WHERE band = 'warning')::int AS warning,
            count(*) FILTER (WHERE band = 'safe')::int AS safe,
            count(*) FILTER (WHERE safety_flag)::int AS "safetyFlagged"
     FROM responses`,
  );
  return rows[0];
}

export type AnswerCount = { question_no: number; option_index: number; picks: number };

// One row per question and option picked. Expands the answers array by position. With a range
// (YYYY-MM-DD, both ends included, Bangkok days) only responses from those days are counted.
export async function getAnswerCounts(range?: { from: string; to: string }): Promise<AnswerCount[]> {
  const { rows } = await getPool().query<AnswerCount>(
    `SELECT a.question_no::int AS question_no,
            a.option_index::int AS option_index,
            count(*)::int AS picks
     FROM responses r
     CROSS JOIN LATERAL unnest(r.answers) WITH ORDINALITY AS a(option_index, question_no)
     ${
       range
         ? `WHERE r.created_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Bangkok')
              AND r.created_at < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Bangkok')`
         : ""
     }
     GROUP BY a.question_no, a.option_index`,
    range ? [range.from, range.to] : [],
  );
  return rows;
}

export type SettingRow = { key: string; value: string; updated_at: Date };

export async function getSettingRows(): Promise<SettingRow[]> {
  const { rows } = await getPool().query<SettingRow>("SELECT key, value, updated_at FROM settings");
  return rows;
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  await getPool().query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  );
}

export async function deleteSetting(key: string): Promise<void> {
  await getPool().query("DELETE FROM settings WHERE key = $1", [key]);
}

export type ChallengeRow = {
  id: string;
  payload: string;
  code_hash: string;
  attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
};

export async function countRecentChallenges(minutes: number): Promise<number> {
  const { rows } = await getPool().query<{ n: number }>(
    "SELECT count(*)::int AS n FROM otp_challenges WHERE created_at > now() - make_interval(mins => $1::int)",
    [minutes],
  );
  return rows[0].n;
}

// Only one challenge can be open at a time, so a new one retires every earlier one.
export async function createChallenge(id: string, payload: string, codeHash: string, ttlMinutes: number): Promise<void> {
  await getPool().query(
    `WITH retired AS (UPDATE otp_challenges SET consumed_at = now() WHERE consumed_at IS NULL)
     INSERT INTO otp_challenges (id, payload, code_hash, expires_at)
     VALUES ($1, $2, $3, now() + make_interval(mins => $4::int))`,
    [id, payload, codeHash, ttlMinutes],
  );
  await getPool().query("DELETE FROM otp_challenges WHERE created_at < now() - interval '7 days'");
}

export async function getChallenge(id: string): Promise<ChallengeRow | null> {
  const { rows } = await getPool().query<ChallengeRow>(
    "SELECT id, payload, code_hash, attempts, expires_at, consumed_at FROM otp_challenges WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

// Counts the try before the code is compared, so parallel guesses can't exceed the limit.
export async function startAttempt(id: string, maxAttempts: number): Promise<ChallengeRow | null> {
  const { rows } = await getPool().query<ChallengeRow>(
    `UPDATE otp_challenges SET attempts = attempts + 1
     WHERE id = $1 AND consumed_at IS NULL AND expires_at > now() AND attempts < $2
     RETURNING id, payload, code_hash, attempts, expires_at, consumed_at`,
    [id, maxAttempts],
  );
  return rows[0] ?? null;
}

// True for exactly one caller, so a correct code can only be used once.
export async function consumeChallenge(id: string): Promise<boolean> {
  const result = await getPool().query(
    "UPDATE otp_challenges SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL AND expires_at > now()",
    [id],
  );
  return result.rowCount === 1;
}

export async function retireChallenge(id: string): Promise<void> {
  await getPool().query("UPDATE otp_challenges SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL", [id]);
}

export async function deleteChallenge(id: string): Promise<void> {
  await getPool().query("DELETE FROM otp_challenges WHERE id = $1", [id]);
}

// Counts one try of the administrator password, before it is compared. While a lock is active the
// count stays as it is. The count starts again when the first try is older than the window.
export async function takePasswordAttempt(windowMinutes: number): Promise<{ attempts: number; lockedUntil: Date | null }> {
  const { rows } = await getPool().query<{ attempts: number; locked_until: Date | null }>(
    `INSERT INTO password_failures AS p (id, attempts, window_started_at)
     VALUES (1, 1, now())
     ON CONFLICT (id) DO UPDATE SET
       attempts = CASE
         WHEN p.locked_until > now() THEN p.attempts
         WHEN p.window_started_at < now() - make_interval(mins => $1::int) THEN 1
         ELSE p.attempts + 1 END,
       window_started_at = CASE
         WHEN p.locked_until > now() THEN p.window_started_at
         WHEN p.window_started_at < now() - make_interval(mins => $1::int) THEN now()
         ELSE p.window_started_at END
     RETURNING attempts, locked_until`,
    [windowMinutes],
  );
  return { attempts: rows[0].attempts, lockedUntil: rows[0].locked_until };
}

export async function lockPassword(minutes: number): Promise<Date> {
  const { rows } = await getPool().query<{ locked_until: Date }>(
    `UPDATE password_failures SET locked_until = now() + make_interval(mins => $1::int)
     WHERE id = 1 RETURNING locked_until`,
    [minutes],
  );
  return rows[0]?.locked_until ?? new Date(Date.now() + minutes * 60_000);
}

// The end of the lock, or null when saving is not locked.
export async function getPasswordLock(): Promise<Date | null> {
  const { rows } = await getPool().query<{ locked_until: Date }>(
    "SELECT locked_until FROM password_failures WHERE id = 1 AND locked_until > now()",
  );
  return rows[0]?.locked_until ?? null;
}

// A correct password starts the count again.
export async function clearPasswordFailures(): Promise<void> {
  await getPool().query("DELETE FROM password_failures WHERE id = 1");
}

export type DailyCount = { day: string; responses: number };

// Completed quizzes per Bangkok calendar day, for dates from and to inclusive (YYYY-MM-DD).
export async function getDailyResponseCounts(from: string, to: string): Promise<DailyCount[]> {
  const { rows } = await getPool().query<DailyCount>(
    `SELECT to_char(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') AS day,
            count(*)::int AS responses
     FROM responses
     WHERE created_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Bangkok')
       AND created_at < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Bangkok')
     GROUP BY day
     ORDER BY day`,
    [from, to],
  );
  return rows;
}

export type RecentResponse = {
  id: string;
  percent_score: number;
  band: string;
  safety_flag: boolean;
  cat1_score: number;
  cat2_score: number;
  cat3_score: number;
  created_at: Date;
};

export async function getRecentResponses(limit = 50): Promise<RecentResponse[]> {
  const { rows } = await getPool().query<RecentResponse>(
    `SELECT id, percent_score, band, safety_flag, cat1_score, cat2_score, cat3_score, created_at
     FROM responses ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}
