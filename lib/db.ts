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

// One row per question and option picked. Expands the answers array by position.
export async function getAnswerCounts(): Promise<AnswerCount[]> {
  const { rows } = await getPool().query<AnswerCount>(
    `SELECT a.question_no::int AS question_no,
            a.option_index::int AS option_index,
            count(*)::int AS picks
     FROM responses r
     CROSS JOIN LATERAL unnest(r.answers) WITH ORDINALITY AS a(option_index, question_no)
     GROUP BY a.question_no, a.option_index`,
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
  action: "set_line_url" | "reset_line_url";
  payload: string | null;
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
export async function createChallenge(
  id: string,
  action: ChallengeRow["action"],
  payload: string | null,
  codeHash: string,
  ttlMinutes: number,
): Promise<void> {
  await getPool().query(
    `WITH retired AS (UPDATE otp_challenges SET consumed_at = now() WHERE consumed_at IS NULL)
     INSERT INTO otp_challenges (id, action, payload, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, now() + make_interval(mins => $5::int))`,
    [id, action, payload, codeHash, ttlMinutes],
  );
  await getPool().query("DELETE FROM otp_challenges WHERE created_at < now() - interval '7 days'");
}

export async function getChallenge(id: string): Promise<ChallengeRow | null> {
  const { rows } = await getPool().query<ChallengeRow>(
    "SELECT id, action, payload, code_hash, attempts, expires_at, consumed_at FROM otp_challenges WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

// Counts the try before the code is compared, so parallel guesses can't exceed the limit.
export async function startAttempt(id: string, maxAttempts: number): Promise<ChallengeRow | null> {
  const { rows } = await getPool().query<ChallengeRow>(
    `UPDATE otp_challenges SET attempts = attempts + 1
     WHERE id = $1 AND consumed_at IS NULL AND expires_at > now() AND attempts < $2
     RETURNING id, action, payload, code_hash, attempts, expires_at, consumed_at`,
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
