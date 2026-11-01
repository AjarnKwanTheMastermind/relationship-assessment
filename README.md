# Strategic Relationship Audit

A 10-question relationship assessment in Thai, built with Next.js and PostgreSQL.

- `/` intro, `/quiz` questions, `/results/[id]` report, `/admin` statistics, `/backoffice` per-question report and charts (both password protected)
- Questions, scoring and result text: `lib/quiz.ts`
- Courses and the LINE link: `lib/courses.ts`
- Database table: `db/schema.sql`

## Run locally

Requires Node 18.17 or newer.

```bash
npm install
cp .env.example .env
```

Set `ADMIN_PASSWORD` in `.env`, then start PostgreSQL in its own terminal. `npm run db:dev` needs no
install. If you have Docker, `docker compose up -d` works too.

```bash
npm run db:dev
```

On Windows, keep the project in a short path such as `C:\dev\relationship-audit`. In a deeply nested
folder, `npm run db:dev` fails with "Postgres init script exited with code 1" because the Postgres
files exceed the 260-character path limit.

In a second terminal:

```bash
npm run db:migrate
npm run dev
```

Open http://localhost:3000. Sign in to `/admin` with the username `admin` and your `ADMIN_PASSWORD`.

## Deploy

Works on any Node host with a PostgreSQL database. Set `DATABASE_URL` and `ADMIN_PASSWORD`, run
`npm run db:migrate` once, then `npm run build` and `npm start`. Serve it over HTTPS, because the
answers are sensitive and `/admin` uses Basic auth.
