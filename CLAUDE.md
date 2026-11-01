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

## Working with the owner

After every change, start the local database and app, open the changed page, and leave them running so the owner can review it. Only offer to commit or push after that. Never run the review against the production database.

## Where things are

- `lib/quiz.ts`: questions, scoring, all result wording
- `lib/courses.ts`: course data and the LINE link
- `lib/db.ts`: connection pool and every SQL query
- `db/schema.sql`: the one table, `responses`
- `components/Quiz.tsx`, `components/Courses.tsx`: the only client components with state
- `app/api/responses/route.ts`: saves a completed quiz
- `app/backoffice/`: per-question report, pie charts and date range usage report; `lib/stats.ts` turns counts into percentages and `lib/dateRange.ts` validates dates. Usage counts completed quizzes per Bangkok day; there are no user identities, and quiz starts aren't recorded
- `middleware.ts`: Basic auth for `/admin` and `/backoffice` (username `admin`)
- `docs/`: Word copies of the design specification and installation manual

## Rules

- **Safety override:** the most severe answer on any of questions 1-3 sets `safetyFlag`. The report must then be critical whatever the total, show helplines and hide all courses and consultation offers. Never weaken this; a high score must not read as "safe" to someone reporting violence.
- **Course wording:** the course copy in `lib/courses.ts` is the client's own marketing text, supplied by the owner and published as written, including strong claims (subconscious control, "100%", "เสพติดเซ็กส์", "คลานเข่ากลับมา"). Keep it as supplied: don't soften or reword it unprompted, and don't add new claims of your own. The owner was told of the consumer-protection risk of absolute claims such as "100%" and price promises such as "ไม่มีทางกลับมาอีก", and chose to keep them. Never turn the headings into instructions for getting around a block, contacting someone who asked for no contact, or pressuring anyone.
- **Privacy:** never store names, contact details or IP addresses with responses. Answers are sensitive, so keep report and admin pages `noindex` and all queries parameterised.
- **Scoring stays on the server.** `lib/quiz.ts` stores option order as red, yellow, green, so an option's index is its score. Reports recalculate from `answers`, so wording and scoring changes also affect old reports.
- Add schema changes to `db/schema.sql` in a form that is safe to run repeatedly.

## Deployment

Production is live at https://strategic-relationship.netlify.app/ on Netlify's free plan, deployed from `main`. The database is Neon project `relationship-audit` (`lingering-band-55049917`, Siripod organization, Singapore, PostgreSQL 18.6).

- `netlify.toml` runs `db:migrate` on production builds only.
- `DATABASE_URL` must be Neon's pooled string. The pool in `lib/db.ts` is small and needs its `error` listener, because Neon suspends after 5 minutes and drops idle connections.
- `ADMIN_PASSWORD` lives in Netlify's dashboard, with a Production value and a scope that includes Functions. Variable changes need a new deploy. A missing value returns 503; a wrong one returns 401.
- Every push to `main` deploys and uses 15 of the free plan's 300 credits, so group changes. Put `[skip netlify]` in the message of commits that only change documents.

**Treat any `.env` created by `neon init` as production.** It points `DATABASE_URL` at the live database, so running the app locally against it reads and writes real responses. Check where it points before testing, and use a local database (`npm run db:dev`) instead.

To check the live site without saving data, use an invalid POST to `/api/responses` (expect 400) and an unknown UUID at `/results/` (404 proves the database connection works). Finishing the quiz saves a real row.

## Documents

The online documents are the source: [design specification](https://claude.ai/artifact/G2J9Ecv4tkGDhbzJv2EYxy) and [installation manual](https://claude.ai/artifact/Eq2Vq1PZrMiUnGU2JnaR4P). Update them first, then refresh the Word copies in `docs/`. The specification's export is large enough to be saved to a file. The manual's export comes back inline as base64, and retyping it corrupted the file twice, so its Word copy has been edited directly and differs slightly in formatting. Ignore Word's `~$` lock files in `docs/`.

## Pitfalls

- Dev builds to `.next-dev` and production to `.next`. `next dev` crashes in the browser with `__webpack_require__.n is not a function` if it reuses production output, so keep them separate.
- `.glass-card` uses `backdrop-filter`, which traps `position: fixed` children. Render popups into `document.body` with a portal.
- `npm run db:dev` fails with "Postgres init script exited with code 1" in deeply nested Windows folders, because of the 260-character path limit. Use a short path such as `C:\dev\relationship-audit`.
- Node 18.17 is the minimum, and the reason Next.js stays on version 14. Next 15 needs Node 18.18 and Next 16 needs Node 20.
- Build-time font download: `next build` needs internet access for Google Fonts.
- The Neon and Netlify CLIs need a newer Node than 18.17 (Neon needs 20.19 or newer). Use a temporary Node 22 if the machine is still on 18.
- A running `next dev` can keep using its old database after `.env` changes. Restart it, and confirm which database a test actually reached.
- `answers` links to questions by position only, so rewording or reordering a question changes what stored answers mean. Add a question version first if questions will change.
