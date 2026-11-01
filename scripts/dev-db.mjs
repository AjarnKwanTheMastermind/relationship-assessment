// Runs a real PostgreSQL server for local development, with no install or Docker needed.
import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const databaseDir = ".pgdata";
const isNew = !existsSync(databaseDir);

const server = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: 5432,
  persistent: true,
});

if (isNew) await server.initialise();
await server.start();
if (isNew) await server.createDatabase("relationship_audit");

console.log("PostgreSQL is running on port 5432. Press Ctrl+C to stop.");

process.on("SIGINT", async () => {
  await server.stop();
  process.exit(0);
});
