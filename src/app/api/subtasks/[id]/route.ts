import { NextRequest, NextResponse } from "next/server";
import { ensureDbSchema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      completed: boolean;
      taskId?: string;
    };

    const db = await ensureDbSchema();
    const completedVal = body.completed ? 1 : 0;

    await db.execute({
      sql: "UPDATE subtasks SET completed = ? WHERE id = ?",
      args: [completedVal, id],
    });

    // Если все подзадачи выполнены, автоматически отмечаем выполненной родительскую задачу
    if (body.taskId && body.completed) {
      const remaining = await db.execute({
        sql: "SELECT COUNT(*) as cnt FROM subtasks WHERE task_id = ? AND completed = 0",
        args: [body.taskId],
      });
      const pendingCount = Number(remaining.rows[0]?.cnt ?? 0);
      if (pendingCount === 0) {
        await db.execute({
          sql: "UPDATE tasks SET completed = 1 WHERE id = ?",
          args: [body.taskId],
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/subtasks/[id] error:", err);
    const message =
      err instanceof Error
        ? err.message
        : "Не удалось обновить статус подзадачи";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
