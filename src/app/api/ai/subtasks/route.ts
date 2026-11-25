import { NextRequest, NextResponse } from "next/server";
import { ensureDbSchema } from "@/lib/db";
import { generateSubtasksWithGemini } from "@/lib/gemini";
import { Subtask } from "@/types/task";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      taskId?: string;
      title?: string;
      category?: string;
    };

    const taskId = body.taskId?.trim();
    const title = body.title?.trim();

    if (!taskId || !title) {
      return NextResponse.json(
        { error: "Не указана задача для декомпозиции" },
        { status: 400 }
      );
    }

    const { subtasks: generatedTitles, model } =
      await generateSubtasksWithGemini(title, body.category);

    const db = await ensureDbSchema();

    const savedSubtasks: Subtask[] = [];
    const statements: Array<{ sql: string; args: Array<string | number> }> = [
      {
        sql: "DELETE FROM subtasks WHERE task_id = ?",
        args: [taskId],
      },
    ];

    for (const subTitle of generatedTitles) {
      const subId = crypto.randomUUID();
      savedSubtasks.push({
        id: subId,
        taskId,
        title: subTitle,
        completed: false,
      });
      statements.push({
        sql: `INSERT INTO subtasks (id, task_id, title, completed) VALUES (?, ?, ?, 0)`,
        args: [subId, taskId, subTitle],
      });
    }

    await db.batch(statements, "write");

    return NextResponse.json({
      subtasks: savedSubtasks,
      model,
    });
  } catch (err) {
    console.error("POST /api/ai/subtasks error:", err);
    const message =
      err instanceof Error
        ? err.message
        : "Ошибка при разбиении задачи через Gemini API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
