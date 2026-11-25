import { GoogleGenAI, Type } from "@google/genai";
import { cleanEnv } from "@/lib/db";
import { QuadrantId } from "@/types/task";

const MODEL_TIMEOUT_MS = 15_000;

// Самая быстрая и стабильная модель (gemini-3.5-flash) идёт первой,
// далее резервные 3.6 / 3.8 на случай временной недоступности.
const MODEL_CANDIDATES = [
  cleanEnv(process.env.GEMINI_MODEL),
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
].filter((m): m is string => Boolean(m));

let cachedWorkingModel: string | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = cleanEnv(process.env.GEMINI_API_KEY);
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error(
      "GEMINI_API_KEY не настроен на сервере. Добавьте ключ в Environment Variables в Vercel / .env.local."
    );
  }
  return new GoogleGenAI({ apiKey });
}

export function getActiveGeminiModel(): string | null {
  return cachedWorkingModel || cleanEnv(process.env.GEMINI_MODEL) || null;
}

export interface ParsedAiTask {
  title: string;
  quadrant: QuadrantId;
  deadline: string | null;
  category: string;
  priorityReason: string;
}

function clampToSevenWords(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 7) return words.join(" ");
  return words.slice(0, 7).join(" ");
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("MODEL_TIMEOUT")), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function generateWithFallback<T>(
  runner: (ai: GoogleGenAI, model: string) => Promise<T>
): Promise<{ result: T; model: string }> {
  const ai = getGeminiClient();

  const modelsToTry = cachedWorkingModel
    ? [cachedWorkingModel, ...MODEL_CANDIDATES.filter((m) => m !== cachedWorkingModel)]
    : MODEL_CANDIDATES;

  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const result = await withTimeout(runner(ai, model), MODEL_TIMEOUT_MS);
      cachedWorkingModel = model;
      return { result, model };
    } catch (err: unknown) {
      lastError = err;
      if (cachedWorkingModel === model) {
        cachedWorkingModel = null;
      }
      const msg = err instanceof Error ? err.message : String(err);
      const shouldFallback =
        msg.includes("MODEL_TIMEOUT") ||
        msg.includes("timeout") ||
        msg.includes("404") ||
        msg.includes("NOT_FOUND") ||
        msg.includes("not found") ||
        msg.includes("not supported") ||
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("high demand") ||
        msg.includes("overloaded") ||
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED");

      if (!shouldFallback) {
        throw err;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Ни одна из моделей Gemini Flash не ответила.");
}

export async function parseBrainDumpWithGemini(
  rawText: string,
  currentIsoDate: string
): Promise<{ tasks: ParsedAiTask[]; model: string }> {
  const prompt = `Ты — интеллектуальный ассистент по тайм-менеджменту и Матрице Эйзенхауэра.
Текущая дата и время пользователя (ISO): ${currentIsoDate}.

Проанализируй следующий текст пользователя (Brain Dump) и извлеки из него все конкретные задачи:
"""
${rawText}
"""

Требования к разбору:
1. Разбей текст на отдельные чёткие задачи на русском языке (title).
2. Распредели каждую задачу в один из 4 квадрантов Матрицы Эйзенхауэра (quadrant):
   - "urgent_important" (Срочно и Важно)
   - "not_urgent_important" (Не срочно и Важно)
   - "urgent_not_important" (Срочно и Не важно)
   - "not_urgent_not_important" (Не срочно и Не важно)
3. Определи дедлайн (deadline) в формате ISO 8601 (например, "2026-11-22T18:00:00"), если в тексте упоминается время/дата ("завтра", "вечером", "в пятницу", "к 17:00"). Если срок не указан, верни пустую строку "".
4. Назначь короткую категорию на русском из 1-2 слов (category), например: "Работа", "Личное", "Здоровье", "Финансы", "Учёба", "Быт".
5. Напиши причину приоритета (priorityReason) на русском языке — СТРОГО ДО 7 СЛОВ, объясняющую, почему задача попала в этот квадрант.`;

  const { result, model } = await generateWithFallback(async (ai, modelName) => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  quadrant: {
                    type: Type.STRING,
                    enum: [
                      "urgent_important",
                      "not_urgent_important",
                      "urgent_not_important",
                      "not_urgent_not_important",
                    ],
                  },
                  deadline: { type: Type.STRING },
                  category: { type: Type.STRING },
                  priorityReason: { type: Type.STRING },
                },
                required: [
                  "title",
                  "quadrant",
                  "deadline",
                  "category",
                  "priorityReason",
                ],
              },
            },
          },
          required: ["tasks"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Gemini вернул пустой ответ");
    }

    const parsed = JSON.parse(jsonText) as { tasks?: ParsedAiTask[] };
    const tasks = (parsed.tasks || [])
      .filter((t) => t.title && t.title.trim())
      .map((t) => ({
        title: t.title.trim(),
        quadrant: t.quadrant,
        deadline: t.deadline && t.deadline.trim() ? t.deadline.trim() : null,
        category: t.category?.trim() || "Общее",
        priorityReason: clampToSevenWords(
          t.priorityReason || "Важно для текущих целей"
        ),
      }));

    return tasks;
  });

  return { tasks: result, model };
}

export async function generateSubtasksWithGemini(
  taskTitle: string,
  category?: string
): Promise<{ subtasks: string[]; model: string }> {
  const prompt = `Разбей следующую задачу на 3–5 конкретных, последовательных и выполнимых подзадач на русском языке.
Задача: "${taskTitle}"
Категория: "${category || "Общее"}"

Каждая подзадача должна быть короткой (до 10 слов) и начинаться с глагола действия.`;

  const { result, model } = await generateWithFallback(async (ai, modelName) => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["subtasks"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Gemini вернул пустой ответ при генерации подзадач");
    }

    const parsed = JSON.parse(jsonText) as { subtasks?: string[] };
    return (parsed.subtasks || []).map((s) => s.trim()).filter(Boolean).slice(0, 6);
  });

  return { subtasks: result, model };
}
