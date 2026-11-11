import { NextResponse } from "next/server";
import { countRecentResponses, getQuestionSetVersion, insertResponse } from "@/lib/db";
import { envInt } from "@/lib/envNumber";
import { isValidAnswers, scoreAnswers } from "@/lib/quiz";
import { clientKey, withinLimit } from "@/lib/rateLimit";
import { securityLog } from "@/lib/securityLog";

// Ten answers fit in about 30 bytes; anything much larger is not a quiz.
const MAX_BODY_BYTES = 2_000;

// Reads the body, giving up as soon as it passes the limit, so a huge upload is never held in memory.
async function readLimited(req: Request): Promise<string | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  if (!req.body) return "";

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function tooMany() {
  return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
}

export async function POST(req: Request) {
  // One address may save a few quizzes a minute; the total below is the backstop when many addresses are used.
  if (!withinLimit(clientKey(req.headers), envInt("QUIZ_IP_LIMIT_PER_MINUTE", 10, 1, 1000))) {
    securityLog("quiz_rate_limited", { scope: "address" });
    return tooMany();
  }

  const text = await readLimited(req);
  if (text === null) return NextResponse.json({ error: "Request too large" }, { status: 413 });

  let body: { answers?: unknown; version?: unknown } | null = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  // The version is the question set the visitor was shown. A page built before versions existed sends none, and
  // those pages only ever showed the built-in questions, which are version 1.
  const version = body?.version === undefined ? 1 : body.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }
  const set = await getQuestionSetVersion(version);
  if (!set) return NextResponse.json({ error: "Unknown version" }, { status: 400 });

  if (!isValidAnswers(body?.answers, set.content.questions.length)) {
    return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  }

  // A ceiling on completed quizzes per minute for the whole site, so the database cannot be filled by a flood.
  if ((await countRecentResponses(60)) >= envInt("RESPONSES_PER_MINUTE", 120, 10, 10_000)) {
    securityLog("quiz_rate_limited", { scope: "total" });
    return tooMany();
  }

  // Scored here rather than trusting the browser, so stored results are consistent.
  const id = await insertResponse(body.answers, scoreAnswers(body.answers, set.content), version);
  return NextResponse.json({ id }, { status: 201 });
}
