import { NextResponse } from "next/server";
import { insertResponse } from "@/lib/db";
import { isValidAnswers, scoreAnswers } from "@/lib/quiz";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!isValidAnswers(body?.answers)) {
    return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  }

  // Scored here rather than trusting the browser, so stored results are consistent.
  const id = await insertResponse(body.answers, scoreAnswers(body.answers));
  return NextResponse.json({ id }, { status: 201 });
}
