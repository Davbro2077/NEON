import { NextRequest, NextResponse } from "next/server";
import { ensureDbSchema } from "@/lib/db";
import { QuadrantId } from "@/types/task";

const VALID_QUADRANTS = new Set<QuadrantId>([
  "urgent_important",
  "not_urgent_important",
  "urgent_not_important",
  "not_urgent_not_important",
]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      quadrant?: QuadrantId;
      completed?: boolean;
    };

    const db = await ensureDbSchema();

    if (body.quadrant !== undefined) {
      if (!VALID_QUADRANTS.has(body.quadrant)) {
        return NextResponse.json(
          { error: "Некорректный квадрант матрицы" },
          { status: 400 }
        );
      }
      await db.execute({
        sql: "UPDATE tasks SET quadrant = ? WHERE id = ?",
        args: [body.quadrant, id],
      });
    }

    if (body.completed !== undefined) {
      const completedVal = body.completed ? 1 : 0;
      await db.execute({
        sql: "UPDATE tasks SET completed = ? WHERE id = ?",
        args: [completedVal, id],
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/tasks/[id] error:", err);
    return NextResponse.json(
      { error: "Не удалось обновить задачу в базе данных" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = await ensureDbSchema();

    await db.execute({
      sql: "DELETE FROM subtasks WHERE task_id = ?",
      args: [id],
    });
    await db.execute({
      sql: "DELETE FROM tasks WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/tasks/[id] error:", err);
    return NextResponse.json(
      { error: "Не удалось удалить задачу из базы данных" },
      { status: 500 }
    );
  }
}
