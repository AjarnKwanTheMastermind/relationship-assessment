# Strategic Relationship Assessment

A 10-question relationship assessment in Thai, built with Next.js and PostgreSQL.

- `/` intro, `/quiz` questions, `/results/[id]` report, `/admin` statistics, `/backoffice` per-question report, charts, date range usage report and settings such as the LINE link (both password protected)
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

## Deploy to Netlify and Neon

Free plans can run the app, but check their limits and terms first, especially for commercial use.

1. **Create the database.** Sign up at [neon.com](https://neon.com) and create a project in the region closest to your visitors. Copy the **pooled** connection string, which has `-pooler` in its host name.
2. **Create the site.** Sign up at [netlify.com](https://www.netlify.com), choose **Add new project**, then **Import an existing project**, and select this GitHub repository. Keep the build settings from `netlify.toml`.
3. **Set environment variables.** Before the first deploy, add `DATABASE_URL` (the Neon string) and `ADMIN_PASSWORD` (a long, unique password). Saving settings in the backoffice asks for this password again.
4. **Deploy.** The production build creates the table, so no separate database step is needed.
5. **Check it.** Finish the quiz, then open `/backoffice` and confirm the response is counted.

Every push to `main` deploys again and uses Netlify credits, so push in batches. Netlify doesn't copy `.env`; settings live only in its dashboard.

## Deploy to your own server

Works on any Node host with a PostgreSQL database. Set `DATABASE_URL` and `ADMIN_PASSWORD`, run
`npm run db:migrate` once, then `npm run build` and `npm start`. Serve it over HTTPS, because the
answers are sensitive and `/admin` uses Basic auth.
