import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";
import ts from "typescript";

nextEnv.loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
  process.exit(1);
}

// The built-in course text lives in TypeScript files that only use plain types, so they can be
// compiled on the fly and imported here without a separate copy of the data.
async function importTs(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const { courses } = await importTs("../lib/courses.ts");
const { courseToValues, validateCourse } = await importTs("../lib/courseEdit.ts");
const { builtInQuestions, CATEGORY_TITLES, CATEGORY_NAMES } = await importTs("../lib/builtInQuestions.ts");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(sql);

  // Each course is stored once. ON CONFLICT DO NOTHING means a course an administrator has
  // edited is never overwritten by a deploy.
  let added = 0;
  for (const course of courses) {
    const { key, ...content } = course;
    const checked = validateCourse(courseToValues(content));
    if (!checked.ok) throw new Error(`Built-in course "${key}" is invalid: ${JSON.stringify(checked.errors)}`);
    const result = await client.query(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING",
      [`course:${key}`, JSON.stringify(courseToValues(checked.value))],
    );
    added += result.rowCount;
  }
  // Version 1 of the question set is the built-in questions: the answers run from worst to best, so the position is
  // also the score (0, 1, 2). ON CONFLICT DO NOTHING means a deploy never touches a version that exists.
  const version1 = {
    categories: [1, 2, 3].map((n) => ({ title: CATEGORY_TITLES[n], name: CATEGORY_NAMES[n] })),
    questions: builtInQuestions.map((q) => ({
      id: q.id,
      category: q.category,
      question: q.question,
      options: q.options.map((text, score) => ({ text, score })),
    })),
  };
  const seeded = await client.query(
    "INSERT INTO question_sets (version, note, content) VALUES (1, $1, $2::jsonb) ON CONFLICT (version) DO NOTHING",
    ["ชุดคำถามเริ่มต้น", JSON.stringify(version1)],
  );

  // Responses saved before versions existed were answered against the built-in questions, which are version 1.
  const stamped = await client.query("UPDATE responses SET question_set_version = 1 WHERE question_set_version IS NULL");
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'responses_question_set_version_fkey') THEN
      ALTER TABLE responses ADD CONSTRAINT responses_question_set_version_fkey
        FOREIGN KEY (question_set_version) REFERENCES question_sets (version);
    END IF;
  END $$`);
  await client.query("ALTER TABLE responses ALTER COLUMN question_set_version SET DEFAULT 1");
  await client.query("ALTER TABLE responses ALTER COLUMN question_set_version SET NOT NULL");

  console.log(
    `Schema is up to date. Courses added to the database: ${added} of ${courses.length}. ` +
      `Question set version 1 added: ${seeded.rowCount === 1 ? "yes" : "no (already there)"}. Responses given version 1: ${stamped.rowCount}.`,
  );
} finally {
  await client.end();
}
