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
  console.log(`Schema is up to date. Courses added to the database: ${added} of ${courses.length}.`);
} finally {
  await client.end();
}
