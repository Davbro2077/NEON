"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { DailyProgressHeader } from "@/components/DailyProgressHeader";
import { BrainDump } from "@/components/BrainDump";
import { EisenhowerMatrix } from "@/components/EisenhowerMatrix";
import { QuadrantId, TaskItem } from "@/types/task";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

export default function HomePage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [breakingDownId, setBreakingDownId] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotice = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  };

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Не удалось загрузить задачи из БД");
      }
      const data = await res.json();
      setTasks(data.tasks || []);
      if (data.model) setActiveModel(data.model);
    } catch (err) {
      console.error(err);
      showNotice(
        "error",
        err instanceof Error ? err.message : "Ошибка загрузки задач"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 1. Brain Dump AI Parse Handler (Server Route -> Gemini API -> Turso DB)
  const handleAnalyzeBrainDump = async (rawText: string) => {
    try {
      setIsAnalyzing(true);
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          currentIsoDate: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ошибка разбора текста через Gemini API");
      }

      if (data.model) setActiveModel(data.model);
      if (Array.isArray(data.tasks)) {
        setTasks((prev) => [...data.tasks, ...prev]);
        showNotice(
          "success",
          `ИИ распознал и сохранил в БД задач: ${data.tasks.length}`
        );
      }
    } catch (err) {
      console.error(err);
      showNotice(
        "error",
        err instanceof Error ? err.message : "Ошибка обращения к ИИ"
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 2. Move Task between Quadrants (Drag & Drop -> Turso DB)
  const handleMoveTask = async (taskId: string, targetQuadrant: QuadrantId) => {
    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, quadrant: targetQuadrant } : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quadrant: targetQuadrant }),
      });
      if (!res.ok) throw new Error("Не удалось обновить квадрант в БД");
    } catch (err) {
      console.error(err);
      setTasks(previousTasks);
      showNotice("error", "Не удалось сохранить перемещение задачи в БД");
    }
  };

  // 3. Toggle Task Completion (Turso DB)
  const handleToggleTask = async (taskId: string, completed: boolean) => {
    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Не удалось обновить статус задачи");
    } catch (err) {
      console.error(err);
      setTasks(previousTasks);
      showNotice("error", "Ошибка сохранения статуса задачи в БД");
    }
  };

  // 4. Delete Task (Turso DB)
  const handleDeleteTask = async (taskId: string) => {
    const previousTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Не удалось удалить задачу");
    } catch (err) {
      console.error(err);
      setTasks(previousTasks);
      showNotice("error", "Ошибка удаления задачи из БД");
    }
  };

  // 5. Breakdown Task into Subtasks via Gemini API + Turso DB
  const handleBreakdownSubtasks = async (task: TaskItem) => {
    try {
      setBreakingDownId(task.id);
      const res = await fetch("/api/ai/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          title: task.title,
          category: task.category,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Не удалось разбить задачу на подзадачи"
        );
      }

      if (data.model) setActiveModel(data.model);
      if (Array.isArray(data.subtasks)) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, subtasks: data.subtasks } : t
          )
        );
        showNotice("success", "Подзадачи сгенерированы ИИ и сохранены в БД");
      }
    } catch (err) {
      console.error(err);
      showNotice(
        "error",
        err instanceof Error ? err.message : "Ошибка генерации подзадач"
      );
    } finally {
      setBreakingDownId(null);
    }
  };

  // 6. Toggle Subtask Completion (Turso DB)
  const handleToggleSubtask = async (
    taskId: string,
    subtaskId: string,
    completed: boolean
  ) => {
    const previousTasks = [...tasks];

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updatedSubtasks = t.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, completed } : s
        );
        const allDone =
          updatedSubtasks.length > 0 &&
          updatedSubtasks.every((s) => s.completed);
        return {
          ...t,
          subtasks: updatedSubtasks,
          completed: allDone ? true : t.completed,
        };
      })
    );

    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed, taskId }),
      });
      if (!res.ok) throw new Error("Не удалось обновить подзадачу");
    } catch (err) {
      console.error(err);
      setTasks(previousTasks);
      showNotice("error", "Не удалось обновить статус подзадачи");
    }
  };

  return (
    <main className="relative min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <AmbientBackground />

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Progress & Brand Header */}
        <DailyProgressHeader tasks={tasks} activeModel={activeModel} />

        {/* Notification Toast */}
        {notification && (
          <div
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-medium backdrop-blur-xl sm:text-sm ${
              notification.type === "error"
                ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
                : "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === "error" ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Smart Brain Dump Input with Web Speech API */}
        <BrainDump
          onAnalyze={handleAnalyzeBrainDump}
          isAnalyzing={isAnalyzing}
        />

        {/* Section Title + Sync Button */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Матрица приоритетов Эйзенхауэра (2×2)
            </h2>
            <p className="text-xs text-slate-500">
              Перетаскивайте карточки между квадрантами (Drag & Drop) • Наведите курсор для 3D-эффекта
            </p>
          </div>

          <button
            type="button"
            onClick={fetchTasks}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-200 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Обновить</span>
          </button>
        </div>

        {/* 2x2 Eisenhower Matrix */}
        <EisenhowerMatrix
          tasks={tasks}
          onMoveTask={handleMoveTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onBreakdownSubtasks={handleBreakdownSubtasks}
          onToggleSubtask={handleToggleSubtask}
          breakingDownId={breakingDownId}
        />
      </div>
    </main>
  );
}
