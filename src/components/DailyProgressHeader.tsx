"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, Flame, CalendarDays, Layers } from "lucide-react";
import { TaskItem } from "@/types/task";

interface DailyProgressHeaderProps {
  tasks: TaskItem[];
  activeModel?: string | null;
}

export function DailyProgressHeader({ tasks, activeModel }: DailyProgressHeaderProps) {
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Count tasks for today (or all active tasks in matrix for daily momentum)
    // We calculate total actionable units (tasks + their subtasks)
    let totalUnits = 0;
    let completedUnits = 0;
    let todayTasksTotal = 0;
    let todayTasksDone = 0;

    for (const task of tasks) {
      const isCreatedToday = task.createdAt?.slice(0, 10) === todayStr;
      const isDueToday = task.deadline?.slice(0, 10) === todayStr;

      if (isCreatedToday || isDueToday || tasks.length > 0) {
        todayTasksTotal += 1;
        if (task.completed) todayTasksDone += 1;
      }

      if (task.subtasks && task.subtasks.length > 0) {
        totalUnits += task.subtasks.length;
        completedUnits += task.subtasks.filter((s) => s.completed).length;
      } else {
        totalUnits += 1;
        if (task.completed) completedUnits += 1;
      }
    }

    const percentage =
      totalUnits === 0 ? 0 : Math.round((completedUnits / totalUnits) * 100);

    return {
      percentage,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.completed).length,
      totalUnits,
      completedUnits,
    };
  }, [tasks]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());
  }, []);

  // SVG Circle progress metrics
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (stats.percentage / 100) * circumference;

  return (
    <header className="glass-panel relative overflow-hidden rounded-3xl border border-white/10 p-5 sm:p-6">
      {/* Decorative top beam */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        {/* Brand & Date */}
        <div className="flex items-start gap-4">
          <motion.div
            whileHover={{ rotateY: 18, rotateX: -12, scale: 1.06 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 via-violet-500/15 to-rose-500/20 p-3 shadow-[0_0_25px_rgba(34,211,238,0.2)]"
          >
            <Sparkles className="h-6 w-6 text-cyan-300" />
          </motion.div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl">
                NEON MATRIX AI
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                {activeModel ? activeModel : "Gemini Flash AI"}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 sm:text-sm">
              <CalendarDays className="h-3.5 w-3.5 text-cyan-400/80" />
              <span className="capitalize">{formattedDate}</span>
              <span className="text-white/20">•</span>
              <span>Матрица Эйзенхауэра & Умный ввод</span>
            </div>
          </div>
        </div>

        {/* Daily Progress Widget */}
        <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md sm:px-5">
          {/* Circular 3D SVG Progress */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90 transform" viewBox="0 0 68 68">
              <circle
                cx="34"
                cy="34"
                r={radius}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="5"
                fill="transparent"
              />
              <motion.circle
                cx="34"
                cy="34"
                r={radius}
                stroke="url(#neonProgressGrad)"
                strokeWidth="5"
                strokeLinecap="round"
                fill="transparent"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                strokeDasharray={circumference}
              />
              <defs>
                <linearGradient
                  id="neonProgressGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                key={stats.percentage}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-sm font-bold text-white"
              >
                {stats.percentage}%
              </motion.span>
            </div>
          </div>

          {/* Linear progress bar & counters */}
          <div className="min-w-[180px] flex-1">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-200">
                <Flame className="h-3.5 w-3.5 text-rose-400" />
                Прогресс дня
              </span>
              <span className="font-mono text-xs text-cyan-300">
                {stats.completedTasks} / {stats.totalTasks} задач
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 p-[1px]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-rose-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]"
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Шагов выполнено: {stats.completedUnits}/{stats.totalUnits}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3 text-violet-400" />
                4 квадранта
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
