import { NextResponse } from "next/server";
import { ensureDbSchema } from "@/lib/db";
import { getActiveGeminiModel } from "@/lib/gemini";
import { QuadrantId, Subtask, TaskItem } from "@/types/task";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const db = await ensureDbSchema();

    const [tasksResult, subtasksResult] = await db.batch(
      [
        `SELECT id, title, category, quadrant, priority_reason, deadline, completed, created_at
         FROM tasks
         ORDER BY created_at DESC`,
        `SELECT id, task_id, title, completed FROM subtasks`,
      ],
      "read"
    );

    const subtasksByTask = new Map<string, Subtask[]>();
    for (const row of subtasksResult.rows) {
      const taskId = String(row.task_id);
      const sub: Subtask = {
        id: String(row.id),
        taskId,
        title: String(row.title),
        completed: Number(row.completed) === 1,
      };
      const existing = subtasksByTask.get(taskId) || [];
      existing.push(sub);
      subtasksByTask.set(taskId, existing);
    }

    const tasks: TaskItem[] = tasksResult.rows.map((row) => {
      const id = String(row.id);
      return {
        id,
        title: String(row.title),
        category: String(row.category),
        quadrant: String(row.quadrant) as QuadrantId,
        priorityReason: String(row.priority_reason || ""),
        deadline: row.deadline ? String(row.deadline) : null,
        completed: Number(row.completed) === 1,
        createdAt: String(row.created_at),
        subtasks: subtasksByTask.get(id) || [],
      };
    });

    return NextResponse.json({
      tasks,
      model: getActiveGeminiModel(),
    });
  } catch (err) {
    console.error("GET /api/tasks error:", err);
    const message =
      err instanceof Error
        ? err.message
        : "Не удалось получить задачи из базы данных Turso";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
