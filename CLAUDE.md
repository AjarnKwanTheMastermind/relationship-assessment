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
- `lib/courses.ts`: course data
- `lib/lineLink.ts`: the default LINE link, its validation (https and line.me or lin.ee only) and the account name derived from it (`LINE: @aj.kwan`, or `LINE Official` for short links)
- `lib/settings.ts`: reads the `settings` table (key and value, one row per setting; no row means the built-in default). `getSettings()` is cached and never throws; `readSettingsNow()` is uncached for the settings page
- `app/backoffice/settings/`: administrators edit the LINE link; saving clears the `settings` cache tag and `revalidatePath('/', 'layout')`
- `lib/adminAuth.ts`: the admin login check, used by the middleware and again inside server actions
- `lib/otp.ts`, `lib/mailer.ts`, `app/backoffice/settings/verify/`: the one-time password (OTP) that approves every settings change. Saving or resetting only creates a pending change in the `otp_challenges` table and emails a 6-digit code to `ADMIN_EMAIL` through Resend; the change is applied only when the right code is entered
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
- **Settings:** public pages must read settings with the cached `getSettings()`, never from the database directly. Values are validated when saved and again when read, because the LINE link becomes an `href` on every page. Keep `/` and `/quiz` static: the root layout's `revalidate` and the cache tag are what update them. Any server action that changes data must call `hasAdminAccess` itself.
- **OTP:** the administrator's email lives only in the `ADMIN_EMAIL` environment variable and must never become editable in the app, or someone with the backoffice password could redirect the codes. Codes are random, stored only as a keyed hash, valid 10 minutes, single use, limited to 5 tries and 3 requests per 15 minutes, and bound to the exact change. A new request retires older ones. Sending fails closed: with no `ADMIN_EMAIL`, or no `RESEND_API_KEY` and `EMAIL_FROM` outside development, saving is refused. Never log the code or show it outside development.

## Deployment

Production is live at https://strategic-relationship.netlify.app/ on Netlify's free plan, deployed from `main`. The database is Neon project `relationship-audit` (`lingering-band-55049917`, Siripod organization, Singapore, PostgreSQL 18.6).

- `netlify.toml` runs `db:migrate` on production builds only.
- `DATABASE_URL` must be Neon's pooled string. The pool in `lib/db.ts` is small and needs its `error` listener, because Neon suspends after 5 minutes and drops idle connections.
- `ADMIN_PASSWORD` lives in Netlify's dashboard, with a Production value and a scope that includes Functions. Variable changes need a new deploy. A missing value returns 503; a wrong one returns 401.
- Editing settings in production also needs `ADMIN_EMAIL` (who receives the OTP), `RESEND_API_KEY` and `EMAIL_FROM` in Netlify, with Production values and a scope that includes Functions. Until they are set the settings page shows what is missing and refuses to save; the rest of the site is unaffected. `db:migrate` creates the `settings` and `otp_challenges` tables on deploy.
- Every push to `main` deploys and uses 15 of the free plan's 300 credits, so group changes. Put `[skip netlify]` in the message of commits that only change documents.

**Treat any `.env` created by `neon init` as production.** It points `DATABASE_URL` at the live database, so running the app locally against it reads and writes real responses. Check where it points before testing, and use a local database (`npm run db:dev`) instead.

To check the live site without saving data, use an invalid POST to `/api/responses` (expect 400) and an unknown UUID at `/results/` (404 proves the database connection works). Finishing the quiz saves a real row.

## Documents

The online documents are the source: [design specification](https://claude.ai/artifact/G2J9Ecv4tkGDhbzJv2EYxy) and [installation manual](https://claude.ai/artifact/Eq2Vq1PZrMiUnGU2JnaR4P). Update them first, then refresh the Word copies in `docs/`. Both exports are now large enough (they contain drawings) to be saved to a file by the tool, which can be decoded exactly; never retype an inline base64 export, because that corrupted a file twice. The manual covers Netlify and Neon only, and its drawings are redrawn menu paths, not screenshots. Ignore Word's `~$` lock files in `docs/`.

## Pitfalls

- Dev builds to `.next-dev` and production to `.next`. `next dev` crashes in the browser with `__webpack_require__.n is not a function` if it reuses production output, so keep them separate.
- `.glass-card` uses `backdrop-filter`, which traps `position: fixed` children. Render popups into `document.body` with a portal.
- `npm run db:dev` fails with "Postgres init script exited with code 1" in deeply nested Windows folders, because of the 260-character path limit. Use a short path such as `C:\dev\relationship-audit`.
- Node 18.17 is the minimum, and the reason Next.js stays on version 14. Next 15 needs Node 18.18 and Next 16 needs Node 20.
- Build-time font download: `next build` needs internet access for Google Fonts.
- The Neon and Netlify CLIs need a newer Node than 18.17 (Neon needs 20.19 or newer). Use a temporary Node 22 if the machine is still on 18.
- Testing a server action in a browser: don't open the page as `http://admin:password@localhost:3000/...`. The action's request then fails with "Request cannot be constructed from a URL that includes credentials". Open that URL once to cache the login, then open the plain URL.
- In development no email is sent: the OTP is printed in the server log and shown on the verification page (only when `NODE_ENV` is `development` and no email service is configured). To test real sending without an account, run a production build with `RESEND_API_KEY`, `EMAIL_FROM` and `RESEND_API_URL=http://localhost:<port>/emails` pointing at a small local server that records the request.
- Editing the database directly bypasses revalidation, so the prebuilt home page can keep an older LINE link for up to 5 minutes. Change settings through the app, or assert on the stored value in tests.
- A running `next dev` can keep using its old database after `.env` changes. Restart it, and confirm which database a test actually reached.
- `answers` links to questions by position only, so rewording or reordering a question changes what stored answers mean. Add a question version first if questions will change.
