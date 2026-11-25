import { NextRequest, NextResponse } from "next/server";
import { ensureDbSchema } from "@/lib/db";
import { parseBrainDumpWithGemini } from "@/lib/gemini";
import { TaskItem } from "@/types/task";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      text?: string;
      currentIsoDate?: string;
    };

    const rawText = body.text?.trim();
    if (!rawText) {
      return NextResponse.json(
        { error: "Введите или надиктуйте текст для разбора" },
        { status: 400 }
      );
    }

    const currentIsoDate = body.currentIsoDate || new Date().toISOString();
    const { tasks: aiTasks, model } = await parseBrainDumpWithGemini(
      rawText,
      currentIsoDate
    );

    const db = await ensureDbSchema();
    const nowIso = new Date().toISOString();
    const savedTasks: TaskItem[] = [];

    if (aiTasks.length > 0) {
      const statements = aiTasks.map((item) => {
        const id = crypto.randomUUID();
        savedTasks.push({
          id,
          title: item.title,
          category: item.category,
          quadrant: item.quadrant,
          priorityReason: item.priorityReason,
          deadline: item.deadline,
          completed: false,
          createdAt: nowIso,
          subtasks: [],
        });

        return {
          sql: `INSERT INTO tasks (id, title, category, quadrant, priority_reason, deadline, completed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
          args: [
            id,
            item.title,
            item.category,
            item.quadrant,
            item.priorityReason,
            item.deadline,
            nowIso,
          ],
        };
      });

      await db.batch(statements, "write");
    }

    return NextResponse.json({
      tasks: savedTasks,
      model,
    });
  } catch (err) {
    console.error("POST /api/ai/parse error:", err);
    const message =
      err instanceof Error
        ? err.message
        : "Ошибка при обращении к Gemini API";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
