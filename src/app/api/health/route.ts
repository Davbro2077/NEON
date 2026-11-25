import { NextResponse } from "next/server";
import { cleanEnv, ensureDbSchema } from "@/lib/db";
import { getActiveGeminiModel } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const tursoUrl = cleanEnv(process.env.TURSO_DATABASE_URL);
  const tursoToken = cleanEnv(process.env.TURSO_AUTH_TOKEN);
  const geminiKey = cleanEnv(process.env.GEMINI_API_KEY);

  const hasTursoUrl = Boolean(tursoUrl && !tursoUrl.startsWith("file:"));
  const hasTursoToken = Boolean(tursoToken);
  const hasGeminiKey = Boolean(
    geminiKey && geminiKey !== "your_gemini_api_key_here"
  );

  let dbConnected = false;
  let dbError: string | null = null;
  let tasksCount: number | null = null;

  try {
    const db = await ensureDbSchema();
    const res = await db.execute("SELECT COUNT(*) as cnt FROM tasks");
    dbConnected = true;
    tasksCount = Number(res.rows[0]?.cnt ?? 0);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const ok = hasTursoUrl && hasTursoToken && hasGeminiKey && dbConnected;

  return NextResponse.json(
    {
      ok,
      runtime: process.env.VERCEL ? "vercel" : "local",
      db: {
        connected: dbConnected,
        driver: "@libsql/client/web",
        hasTursoUrl,
        hasTursoToken,
        tasksCount,
        error: dbError,
      },
      ai: {
        hasGeminiKey,
        preferredModel: "gemini-3.5-flash",
        activeModel: getActiveGeminiModel(),
      },
    },
    { status: ok ? 200 : 500 }
  );
}
