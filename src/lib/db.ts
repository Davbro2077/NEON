import { createClient, Client } from "@libsql/client/web";

let clientInstance: Client | null = null;
let schemaInitialized = false;

export function cleanEnv(value?: string): string {
  if (!value) return "";
  return value.trim().replace(/^["']|["']$/g, "").trim();
}

export function getDbClient(): Client {
  if (!clientInstance) {
    const url = cleanEnv(process.env.TURSO_DATABASE_URL);
    const authToken = cleanEnv(process.env.TURSO_AUTH_TOKEN);

    if (!url || url.startsWith("file:")) {
      throw new Error(
        "TURSO_DATABASE_URL не настроен для облачной БД Turso (ожидается libsql://... или https://...). Проверьте Environment Variables в Vercel / .env.local."
      );
    }

    if ((url.startsWith("libsql://") || url.includes(".turso.io")) && !authToken) {
      throw new Error("TURSO_AUTH_TOKEN не задан в переменных окружения.");
    }

    clientInstance = createClient({
      url,
      authToken: authToken || undefined,
    });
  }
  return clientInstance;
}

export async function ensureDbSchema(): Promise<Client> {
  const db = getDbClient();
  if (schemaInitialized) return db;

  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Общее',
        quadrant TEXT NOT NULL DEFAULT 'not_urgent_important',
        priority_reason TEXT NOT NULL DEFAULT '',
        deadline TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )`,
    ],
    "write"
  );

  schemaInitialized = true;
  return db;
}
