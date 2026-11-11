import { Pool } from "pg";
import { parseStoredSet, type QuestionSetContent } from "./questionSet";
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

// The version is the question set the answers were given for, so the response can always be read against it.
export async function insertResponse(answers: number[], result: AuditResult, questionSetVersion: number): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO responses
       (answers, cat1_score, cat2_score, cat3_score, percent_score, band, safety_flag, question_set_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      answers,
      result.categories[0].score,
      result.categories[1].score,
      result.categories[2].score,
      result.percentScore,
      result.band,
      result.safetyFlag,
      questionSetVersion,
    ],
  );
  return rows[0].id;
}

// The answers of one response and the version of the question set they were given for.
export async function getResponseAnswers(id: string): Promise<{ answers: number[]; version: number } | null> {
  const { rows } = await getPool().query<{ answers: number[]; version: number }>(
    "SELECT answers, question_set_version AS version FROM responses WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
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
// (YYYY-MM-DD, both ends included, Bangkok days) only responses from those days are counted, and with a version
// only responses answered against that question set, because the same position can mean a different question
// in another version.
export async function getAnswerCounts(range?: { from: string; to: string }, version?: number): Promise<AnswerCount[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (range) {
    params.push(range.from, range.to);
    conditions.push(
      `r.created_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Bangkok')`,
      `r.created_at < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Bangkok')`,
    );
  }
  if (version !== undefined) {
    params.push(version);
    conditions.push(`r.question_set_version = $${params.length}`);
  }
  const { rows } = await getPool().query<AnswerCount>(
    `SELECT a.question_no::int AS question_no,
            a.option_index::int AS option_index,
            count(*)::int AS picks
     FROM responses r
     CROSS JOIN LATERAL unnest(r.answers) WITH ORDINALITY AS a(option_index, question_no)
     ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
     GROUP BY a.question_no, a.option_index`,
    params,
  );
  return rows;
}

export type QuestionSetVersion = { version: number; createdAt: Date; note: string; content: QuestionSetContent };
export type QuestionSetSummary = { version: number; createdAt: Date; note: string; responses: number };

type QuestionSetRow = { version: number; created_at: Date; note: string; content: unknown };

// A stored set is checked again here, so a damaged row is skipped instead of reaching the quiz.
function toVersion(row: QuestionSetRow): QuestionSetVersion | null {
  const content = parseStoredSet(row.content);
  return content ? { version: row.version, createdAt: row.created_at, note: row.note, content } : null;
}

// The newest valid set: the one visitors see. Null only when no valid set exists at all.
export async function getLatestQuestionSet(): Promise<QuestionSetVersion | null> {
  const { rows } = await getPool().query<QuestionSetRow>(
    "SELECT version, created_at, note, content FROM question_sets ORDER BY version DESC LIMIT 20",
  );
  for (const row of rows) {
    const found = toVersion(row);
    if (found) return found;
  }
  return null;
}

export async function getQuestionSetVersion(version: number): Promise<QuestionSetVersion | null> {
  const { rows } = await getPool().query<QuestionSetRow>(
    "SELECT version, created_at, note, content FROM question_sets WHERE version = $1",
    [version],
  );
  return rows[0] ? toVersion(rows[0]) : null;
}

// Every version, newest first, with how many responses were answered against it.
export async function listQuestionSets(): Promise<QuestionSetSummary[]> {
  const { rows } = await getPool().query<{ version: number; created_at: Date; note: string; responses: number }>(
    `SELECT s.version, s.created_at, s.note, count(r.id)::int AS responses
     FROM question_sets s
     LEFT JOIN responses r ON r.question_set_version = s.version
     GROUP BY s.version, s.created_at, s.note
     ORDER BY s.version DESC`,
  );
  return rows.map((r) => ({ version: r.version, createdAt: r.created_at, note: r.note, responses: r.responses }));
}

// Saves a new version. The number is taken inside a transaction that holds a lock, so two saves at the same time
// cannot get the same number.
export async function insertQuestionSet(content: QuestionSetContent, note: string): Promise<number> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(727003)");
    const { rows } = await client.query<{ version: number }>(
      `INSERT INTO question_sets (version, note, content)
       VALUES ((SELECT COALESCE(MAX(version), 0) + 1 FROM question_sets), $1, $2::jsonb)
       RETURNING version`,
      [note, JSON.stringify(content)],
    );
    await client.query("COMMIT");
    return rows[0].version;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
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

// Creates a challenge, unless this many were already created in the window. The count and the insert happen
// inside one transaction that holds a lock, so a burst of parallel requests cannot all pass the check.
// Only one challenge can be open at a time, so a new one retires every earlier one. False when the limit is reached.
export async function createChallengeLimited(
  id: string,
  payload: string,
  codeHash: string,
  ttlMinutes: number,
  windowMinutes: number,
  maxRequests: number,
): Promise<boolean> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    // Transaction-level lock (released at COMMIT or ROLLBACK), so it also works behind Neon's pooler.
    await client.query("SELECT pg_advisory_xact_lock(727001)");
    const { rows } = await client.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM otp_challenges WHERE created_at > now() - make_interval(mins => $1::int)",
      [windowMinutes],
    );
    if (rows[0].n >= maxRequests) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query("UPDATE otp_challenges SET consumed_at = now() WHERE consumed_at IS NULL");
    await client.query(
      "INSERT INTO otp_challenges (id, payload, code_hash, expires_at) VALUES ($1, $2, $3, now() + make_interval(mins => $4::int))",
      [id, payload, codeHash, ttlMinutes],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  await getPool().query("DELETE FROM otp_challenges WHERE created_at < now() - interval '7 days'");
  return true;
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

// Wrong tries of the administrator password (settings forms) and of the backoffice login are counted the same
// way, each in its own one-row table. The table name comes from this fixed list, never from a request.
type FailureTable = "password_failures" | "login_failures";

// Counts one try, before the password is compared. While a lock is active the count stays as it is.
// The count starts again when the first try is older than the window.
async function takeAttempt(table: FailureTable, windowMinutes: number): Promise<{ attempts: number; lockedUntil: Date | null }> {
  const { rows } = await getPool().query<{ attempts: number; locked_until: Date | null }>(
    `INSERT INTO ${table} AS p (id, attempts, window_started_at)
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

async function lockFailures(table: FailureTable, minutes: number): Promise<Date> {
  const { rows } = await getPool().query<{ locked_until: Date }>(
    `UPDATE ${table} SET locked_until = now() + make_interval(mins => $1::int) WHERE id = 1 RETURNING locked_until`,
    [minutes],
  );
  return rows[0]?.locked_until ?? new Date(Date.now() + minutes * 60_000);
}

export const takePasswordAttempt = (windowMinutes: number) => takeAttempt("password_failures", windowMinutes);
export const lockPassword = (minutes: number) => lockFailures("password_failures", minutes);
export const takeLoginAttempt = (windowMinutes: number) => takeAttempt("login_failures", windowMinutes);
export const lockLogin = (minutes: number) => lockFailures("login_failures", minutes);

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

export async function clearLoginFailures(): Promise<void> {
  await getPool().query("DELETE FROM login_failures WHERE id = 1");
}

// Completed quizzes saved in the last N seconds, for the limit on how fast the quiz can be filled in.
export async function countRecentResponses(seconds: number): Promise<number> {
  const { rows } = await getPool().query<{ n: number }>(
    "SELECT count(*)::int AS n FROM responses WHERE created_at > now() - make_interval(secs => $1::int)",
    [seconds],
  );
  return rows[0].n;
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
