# Strategic Relationship Audit

A 10-question relationship assessment in Thai. Next.js 14 (App Router), TypeScript, Tailwind CSS, PostgreSQL through `pg` with plain SQL. All user-facing text is Thai.

## Commands

```bash
npm run db:dev      # local PostgreSQL on port 5432, no install needed; keep running
npm run db:migrate  # apply db/schema.sql; safe to repeat
npm run dev         # http://localhost:3000
npm run typecheck
npm run build
```

Setup: copy `.env.example` to `.env`, then set `ADMIN_PASSWORD`. There is no automated test suite, so check changes by clicking through the app in a browser.

## Where things are

- `lib/quiz.ts`: questions, scoring, all result wording
- `lib/courses.ts`: course data and the LINE link
- `lib/db.ts`: connection pool and every SQL query
- `db/schema.sql`: the one table, `responses`
- `components/Quiz.tsx`, `components/Courses.tsx`: the only client components with state
- `app/api/responses/route.ts`: saves a completed quiz
- `app/backoffice/`: per-question report and pie charts; `lib/stats.ts` turns counts into percentages
- `middleware.ts`: Basic auth for `/admin` and `/backoffice` (username `admin`)
- `docs/`: Word copies of the design specification and installation manual; they can go out of date

## Rules

- **Safety override:** the most severe answer on any of questions 1-3 sets `safetyFlag`. The report must then be critical whatever the total, show helplines and hide all courses and consultation offers. Never weaken this; a high score must not read as "safe" to someone reporting violence.
- **Course wording:** do not add claims of hypnosis, subconscious control, guaranteed results, or making a partner sexually "addicted". These were removed on purpose.
- **Privacy:** never store names, contact details or IP addresses with responses. Answers are sensitive, so keep report and admin pages `noindex` and all queries parameterised.
- **Scoring stays on the server.** `lib/quiz.ts` stores option order as red, yellow, green, so an option's index is its score. Reports recalculate from `answers`, so wording and scoring changes also affect old reports.
- Add schema changes to `db/schema.sql` in a form that is safe to run repeatedly.

## Pitfalls

- Dev builds to `.next-dev` and production to `.next`. `next dev` crashes in the browser with `__webpack_require__.n is not a function` if it reuses production output, so keep them separate.
- `.glass-card` uses `backdrop-filter`, which traps `position: fixed` children. Render popups into `document.body` with a portal.
- `npm run db:dev` fails with "Postgres init script exited with code 1" in deeply nested Windows folders, because of the 260-character path limit. Use a short path such as `C:\dev\relationship-audit`.
- Node 18.17 is the minimum, and the reason Next.js stays on version 14. Next 15 needs Node 18.18 and Next 16 needs Node 20.
- Build-time font download: `next build` needs internet access for Google Fonts.
