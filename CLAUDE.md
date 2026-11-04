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
- `lib/courses.ts`: the built-in course data (defaults). Administrators can override each course in the backoffice; each course is one `settings` row named `course:<key>` holding the form values as JSON. `scripts/migrate.mjs` inserts a row for every built-in course that has none (`ON CONFLICT DO NOTHING`, so a deploy never overwrites an edit), and "reset" writes the built-in text back into the row. If a row is missing or invalid the page still falls back to the built-in text. Changing `lib/courses.ts` therefore only affects courses that have no row yet
- `lib/courseEdit.ts`: editable course fields, limits and validation, shared by the edit form, the server action and the settings reader. `app/backoffice/settings/courses/` and `components/CourseForm.tsx` are the edit pages
- `lib/lineLink.ts`: the default LINE link, its validation (https and line.me or lin.ee only) and the account name derived from it (`LINE: @aj.kwan`, or `LINE Official` for short links)
- `lib/settings.ts`: reads the `settings` table (key and value, one row per setting; no row means the built-in default). `getSettings()` is cached and never throws; `readSettingsNow()` is uncached for the settings page
- `app/backoffice/settings/`: administrators edit the LINE link; saving clears the `settings` cache tag and `revalidatePath('/', 'layout')`
- `lib/adminAuth.ts`: the admin login check, used by the middleware and again inside server actions
- `lib/confirmPassword.ts`: constant-time check of the administrator password typed on the settings form, which every settings change must include while `TWO_FACTOR_AUTHEN` is off. `lib/passwordLock.ts` holds the limits read from `PASSWORD_MAX_ATTEMPTS` and `PASSWORD_LOCK_MINUTES` (through `lib/envNumber.ts`, which falls back to the default for a missing or invalid value), `lib/changeFlow.ts` does the counting and locking, `lib/lockMessages.ts` and `components/LockNotice.tsx` show the tries left and the lock on the settings pages
- `lib/notify.ts`, `components/MailNotice.tsx`: after every successful settings or course change (save or reset) the administrator is emailed through Resend: Bangkok and UTC time, each changed setting with old and new value (cut at 200 characters), the requester's IP and browser (email only, never stored), a warning that an unexpected change may mean the site is attacked or hacked, and the steps to shut down (`MAINTENANCE_MODE`) and investigate. Sending runs after the save and never blocks or undoes it; the redirect carries `mail=sent|failed|off` and the settings pages show it. A wrong password sends nothing
- `lib/twoFactor.ts`, `lib/otp.ts`, `lib/pending.ts`, `lib/changeFlow.ts`, `lib/applyChange.ts`, `app/backoffice/settings/verify/`: two-factor authentication for settings changes, switched by the `TWO_FACTOR_AUTHEN` environment variable (`on`). Off: the typed password is checked and the change is applied. On: the forms have no password box; saving only creates a pending change in the `otp_challenges` table (JSON in `payload`) and emails a 6-digit code to `ADMIN_EMAIL`, and the change is applied only when the code is entered on the verify page. Codes are random, stored only as a keyed hash, valid 10 minutes, single use, and by default 5 tries per code and 3 requests per 15 minutes (`OTP_TTL_MINUTES`, `OTP_MAX_ATTEMPTS`, `OTP_MAX_REQUESTS`, `OTP_REQUEST_WINDOW_MINUTES`); a new request retires older ones. Every change goes through `applyChange` in `lib/applyChange.ts`, so both paths write and notify the same way
- `lib/db.ts`: connection pool and every SQL query
- `db/schema.sql`: the tables `responses`, `settings` and `otp_challenges`
- `components/Quiz.tsx`, `components/Courses.tsx`: the client components with state; `components/BackofficeNav.tsx` is a client component only to highlight the current menu item
- `app/api/responses/route.ts`: saves a completed quiz
- `app/backoffice/`: the menu is สถิติรายข้อ, การใช้งาน and ตั้งค่า. สถิติรายข้อ has two views chosen by a sub menu (`components/QuestionStatsHeader.tsx`): numbers at `/backoffice/report` and pie charts at `/backoffice/charts`, and `BackofficeNav` keeps the tab highlighted on both. Both views take `?period=range&from=YYYY-MM-DD&to=YYYY-MM-DD` (no `period`, or `period=all`, means all time), read by `parsePeriod` in `lib/dateRange.ts` with no length limit and applied by `getAnswerCounts(range)` in Bangkok days; `components/PeriodFilter.tsx` is the all time or date range choice, and the sub menu links carry the chosen period. The date range usage report (the usage page also draws a line chart of completed quizzes per day with `components/LineChart.tsx`, plain SVG with no library or script so the content security policy needs no change; quick 7/30/90/365 day links come from `lastDays` in `lib/dateRange.ts`); `lib/stats.ts` turns counts into percentages and `lib/dateRange.ts` validates dates. Usage counts completed quizzes per Bangkok day; there are no user identities, and quiz starts aren't recorded
- `middleware.ts`: Basic auth for `/admin` and `/backoffice` (username `admin`), and maintenance mode for everything else. With `MAINTENANCE_MODE=on` every public path returns a Thai 503 page (`lib/maintenance.ts`, with the helplines from `lib/helplines.ts`) and `/api/*` returns a 503 JSON error, so nothing can be saved; the backoffice stays reachable. The matcher covers all paths except `_next/static`, `_next/image` and the favicon, so it also closes the prebuilt `/` and `/quiz`
- `docs/`: Word copies of the design specification and installation manual

## Rules

- **Safety override:** the most severe answer on any of questions 1-3 sets `safetyFlag`. The report must then be critical whatever the total, show helplines and hide all courses and consultation offers. Never weaken this; a high score must not read as "safe" to someone reporting violence.
- **Course wording:** the course copy in `lib/courses.ts` is the client's own marketing text, supplied by the owner and published as written, including strong claims (subconscious control, "100%", "เสพติดเซ็กส์", "คลานเข่ากลับมา"). Keep it as supplied (this applies to the defaults, and the administrator's own edits are stored and shown as typed): don't soften or reword it unprompted, and don't add new claims of your own. The owner was told of the consumer-protection risk of absolute claims such as "100%" and price promises such as "ไม่มีทางกลับมาอีก", and chose to keep them. Never turn the headings into instructions for getting around a block, contacting someone who asked for no contact, or pressuring anyone.
- **Privacy:** never store names, contact details or IP addresses with responses. Answers are sensitive, so keep report and admin pages `noindex` and all queries parameterised.
- **Scoring stays on the server.** `lib/quiz.ts` stores option order as red, yellow, green, so an option's index is its score. Reports recalculate from `answers`, so wording and scoring changes also affect old reports.
- Add schema changes to `db/schema.sql` in a form that is safe to run repeatedly.
- **Settings:** public pages must read settings with the cached `getSettings()`, never from the database directly. Values are validated when saved and again when read, because the LINE link becomes an `href` on every page. Keep `/` and `/quiz` static: the root layout's `revalidate` and the cache tag are what update them. Any server action that changes data must call `hasAdminAccess` itself.
- **Confirming changes:** with `TWO_FACTOR_AUTHEN` off, every settings change asks for the administrator password again (checked on the server against `ADMIN_PASSWORD`, with a 1 second pause on a wrong one, and a lock: after `PASSWORD_MAX_ATTEMPTS` wrong tries in a row (default 5, one count shared by everyone, kept in the `password_failures` table and added before the password is compared so a burst of parallel guesses cannot beat it) saving is refused for `PASSWORD_LOCK_MINUTES` (default 15), even with the right password, and the administrator is emailed once; a correct password starts the count again). With `TWO_FACTOR_AUTHEN=on` the password box is gone and a one-time password emailed to `ADMIN_EMAIL` approves the change instead; if a code can't be sent, saving is refused (fail closed) and never falls back to the password. The switch, `ADMIN_EMAIL` and the limits live only in the environment and must never become editable in the app, or someone with the backoffice password could switch it off or redirect the codes and warnings. The server reads `TWO_FACTOR_AUTHEN` on every save, never from a cached page or from the form. Never log the code or show it outside development, and never put the password or full long text in an email; the code email is the only one that carries a code.

## Deployment

Production is live at https://strategic-relationship.netlify.app/ on Netlify's free plan, deployed from `main`. The database is Neon project `relationship-audit` (`lingering-band-55049917`, Siripod organization, Singapore, PostgreSQL 18.6).

- `netlify.toml` runs `db:migrate` on production builds only.
- `DATABASE_URL` must be Neon's pooled string. The pool in `lib/db.ts` is small and needs its `error` listener, because Neon suspends after 5 minutes and drops idle connections.
- `ADMIN_PASSWORD` lives in Netlify's dashboard, with a Production value and a scope that includes Functions. Variable changes need a new deploy. A missing value returns 503; a wrong one returns 401.
- Editing settings in production needs only `ADMIN_PASSWORD`. The change notification also needs `ADMIN_EMAIL` (recipient), `RESEND_API_KEY` and `EMAIL_FROM` (Production values, scope including Functions, then a new deploy); without them saving still works and the settings page says no email was sent. Test sending locally with `RESEND_API_URL=http://localhost:<port>/emails` pointing at a small server that records the request. Two-factor authentication is `TWO_FACTOR_AUTHEN=on` in Netlify (Production value, scope including Functions, then a new deploy); it needs the three email variables. If email stops working while it is on, nobody can save: fix the email variables, or remove `TWO_FACTOR_AUTHEN`, and deploy. `db:migrate` creates the `settings` table and seeds the course rows on deploy; it compiles `lib/courses.ts` with `typescript`, so that must stay installed at build time.
- Maintenance mode is the only off switch, because Netlify has no server process to stop: add `MAINTENANCE_MODE=on` in Netlify (Production value, scope including Functions) and deploy; remove it and deploy to reopen. Each change is a deploy (15 credits). Keep the page free of scripts and external files so it can't fail with the rest of the site.
- Every push to `main` deploys and uses 15 of the free plan's 300 credits, so group changes. Put `[skip netlify]` in the message of commits that only change documents.

**Treat any `.env` created by `neon init` as production.** It points `DATABASE_URL` at the live database, so running the app locally against it reads and writes real responses. Check where it points before testing, and use a local database (`npm run db:dev`) instead.

To check the live site without saving data, use an invalid POST to `/api/responses` (expect 400) and an unknown UUID at `/results/` (404 proves the database connection works). Finishing the quiz saves a real row.

## Documents

The online documents are the source: [design specification](https://claude.ai/artifact/G2J9Ecv4tkGDhbzJv2EYxy) and [installation manual](https://claude.ai/artifact/Eq2Vq1PZrMiUnGU2JnaR4P). A fourth online document, the [security review report](https://claude.ai/artifact/EiXGtGoW1XveLd4YxavXpV) (findings, fixes and how to repeat the checks; online only, no Word copy), complements them. A third online document, the [system administration manual](https://claude.ai/artifact/6qbfJSy1HYnsffFVMErc7B), covers running Netlify, Neon and the backoffice settings (shutdown and startup, maintenance mode, routine tasks); its Netlify screenshots were taken from the signed-in console with secrets hidden, and Neon has none yet. Update the online documents first, then refresh the Word copies in `docs/` (all three have one; the exporter leaves the results-page screenshot of the administration manual as a text placeholder, so after each re-export put `08-results-courses` back by adding it to `word/media`, a relationship in `word/_rels/document.xml.rels` and a drawing paragraph copied from another image, then check the file opens). The exports are large enough (they contain drawings or screenshots) to be saved to a file by the tool, which can be decoded exactly; never retype an inline base64 export, because that corrupted a file twice. The installation manual covers Netlify and Neon only, and its drawings are redrawn menu paths, not screenshots. Ignore Word's `~$` lock files in `docs/`.

## Pitfalls

- Dev builds to `.next-dev` and production to `.next`. `next dev` crashes in the browser with `__webpack_require__.n is not a function` if it reuses production output, so keep them separate.
- `.glass-card` uses `backdrop-filter`, which traps `position: fixed` children. Render popups into `document.body` with a portal.
- `npm run db:dev` fails with "Postgres init script exited with code 1" in deeply nested Windows folders, because of the 260-character path limit. Use a short path such as `C:\dev\relationship-audit`.
- Node 18.17 is the minimum, and the reason Next.js stays on version 14. Next 15 needs Node 18.18 and Next 16 needs Node 20.
- Build-time font download: `next build` needs internet access for Google Fonts.
- The Neon and Netlify CLIs need a newer Node than 18.17 (Neon needs 20.19 or newer). Use a temporary Node 22 if the machine is still on 18.
- Testing a server action in a browser: don't open the page as `http://admin:password@localhost:3000/...`. The action's request then fails with "Request cannot be constructed from a URL that includes credentials". Open that URL once to cache the login, then open the plain URL.
- Editing the database directly bypasses revalidation, so the prebuilt home page can keep an older LINE link for up to 5 minutes. Change settings through the app, or assert on the stored value in tests.
- `next.config.mjs` sends a strict Content-Security-Policy (own address only), `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` and a Permissions-Policy on every response, switches off the image optimizer and removes `X-Powered-By`. If you add an external script, font, image host or embed (for example a QR service or analytics), add its address to the policy or the browser silently blocks it. Test on a production build, because development allows extra sources.
- A running `next dev` can keep using its old database after `.env` changes. Restart it, and confirm which database a test actually reached.
- The database must be UTF8 to store Thai text in `settings`. Neon is. `npm run db:dev` now creates new local clusters as UTF8, but a `.pgdata` made earlier on Windows is WIN1252 and fails with "has no equivalent in encoding WIN1252" when saving a course. Recreate the database as UTF8 (copy `responses` across) or delete `.pgdata`.
- Course forms must not be submittable before the page has loaded: a plain browser submit would be a GET that puts the password and text in the address bar. `CourseForm` keeps its buttons disabled until then.
- `answers` links to questions by position only, so rewording or reordering a question changes what stored answers mean. Add a question version first if questions will change.
