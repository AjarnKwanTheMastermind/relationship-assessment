import { Pool } from "pg";
import type { AuditResult } from "./quiz";

// Reuse one pool across hot reloads in development.
const globalForPool = globalThis as unknown as { pgPool?: Pool };

function getPool(): Pool {
  if (!globalForPool.pgPool) {
    globalForPool.pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
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
