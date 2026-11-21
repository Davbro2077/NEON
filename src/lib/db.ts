import { createClient, Client } from "@libsql/client";

let clientInstance: Client | null = null;
let schemaInitialized = false;

export function getDbClient(): Client {
  if (!clientInstance) {
    const url = process.env.TURSO_DATABASE_URL || "file:local.db";
    const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

    clientInstance = createClient({
      url,
      authToken,
    });
  }
  return clientInstance;
}

export async function ensureDbSchema(): Promise<Client> {
  const db = getDbClient();
  if (schemaInitialized) return db;

  await db.execute("PRAGMA foreign_keys = ON");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Общее',
      quadrant TEXT NOT NULL DEFAULT 'not_urgent_important',
      priority_reason TEXT NOT NULL DEFAULT '',
      deadline TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `);

  schemaInitialized = true;
  return db;
}
