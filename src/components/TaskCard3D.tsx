"use client";

import React, { useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";
import {
  Check,
  Clock,
  Sparkles,
  Trash2,
  GripVertical,
  GitBranchPlus,
  Loader2,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TaskItem } from "@/types/task";

interface TaskCard3DProps {
  task: TaskItem;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onBreakdownSubtasks: (task: TaskItem) => Promise<void>;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
  isBreakingDown: boolean;
}

export function TaskCard3D({
  task,
  provided,
  snapshot,
  onToggleTask,
  onDeleteTask,
  onBreakdownSubtasks,
  onToggleSubtask,
  isBreakingDown,
}: TaskCard3DProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);

  // 3D Tilt & Glare spotlight
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [7, -7]), {
    stiffness: 260,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-7, 7]), {
    stiffness: 260,
    damping: 22,
  });

  const spotlightBg = useMotionTemplate`radial-gradient(260px circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.11), transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || snapshot.isDragging) return;
    const rect = cardRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    mouseX.set(relX);
    mouseY.set(relY);
    glareX.set(relX * 100);
    glareY.set(relY * 100);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
    glareX.set(50);
    glareY.set(50);
  };

  const formattedDeadline = React.useMemo(() => {
    if (!task.deadline) return null;
    try {
      const date = new Date(task.deadline);
      if (isNaN(date.getTime())) return task.deadline;
      return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return task.deadline;
    }
  }, [task.deadline]);

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasksCount = hasSubtasks
    ? task.subtasks.filter((s) => s.completed).length
    : 0;

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={provided.draggableProps.style}
      className="perspective-1000 mb-3 last:mb-0"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: snapshot.isDragging ? 0 : rotateX,
          rotateY: snapshot.isDragging ? 0 : rotateY,
        }}
        animate={{
          scale: snapshot.isDragging ? 1.04 : 1,
        }}
        className={`glass-card group relative overflow-hidden rounded-2xl border p-4 transition-colors ${
          snapshot.isDragging
            ? "z-50 border-cyan-400/60 bg-slate-900/90 shadow-[0_18px_45px_rgba(34,211,238,0.28)]"
            : task.completed
            ? "border-white/5 bg-white/[0.02] opacity-65"
            : "border-white/10 hover:border-white/25"
        }`}
      >
        {/* Dynamic cursor glare */}
        <motion.div
          style={{ background: spotlightBg }}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        {/* Top Row: Checkbox, Title, Drag Handle & Delete */}
        <div className="relative z-10 flex items-start gap-3">
          {/* Custom Neon Checkbox */}
          <button
            type="button"
            onClick={() => onToggleTask(task.id, !task.completed)}
            aria-label="Отметить задачу выполненной"
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
              task.completed
                ? "border-emerald-400 bg-emerald-500/30 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                : "border-white/25 bg-black/30 hover:border-cyan-400"
            }`}
          >
            {task.completed && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
          </button>

          {/* Task Title & AI Justification */}
          <div className="min-w-0 flex-1">
            <h4
              className={`text-sm font-medium leading-snug transition ${
                task.completed
                  ? "text-slate-400 line-through"
                  : "text-slate-100"
              }`}
            >
              {task.title}
            </h4>

            {/* AI Priority Justification (strictly up to 7 words) */}
            {task.priorityReason && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-cyan-300/90">
                <Sparkles className="h-3 w-3 shrink-0 text-cyan-400" />
                <span className="truncate italic" title={task.priorityReason}>
                  «{task.priorityReason}»
                </span>
              </div>
            )}
          </div>

          {/* Drag Handle & Delete Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onDeleteTask(task.id)}
              title="Удалить задачу"
              className="rounded-lg p-1.5 text-slate-500 opacity-70 transition hover:bg-rose-500/15 hover:text-rose-300 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            <div
              {...provided.dragHandleProps}
              title="Перетащить в другой квадрант"
              className="cursor-grab rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-200 active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Metadata Badges & Breakdown Button */}
        <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Category Badge */}
            {task.category && (
              <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                <Tag className="h-2.5 w-2.5 text-violet-400" />
                {task.category}
              </span>
            )}

            {/* Deadline Badge */}
            {formattedDeadline && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                <Clock className="h-2.5 w-2.5" />
                {formattedDeadline}
              </span>
            )}
          </div>

          {/* AI Subtask Breakdown Button */}
          <div className="flex items-center gap-1.5">
            {hasSubtasks && (
              <button
                type="button"
                onClick={() => setSubtasksExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-300 transition hover:bg-white/10"
              >
                <span>
                  {completedSubtasksCount}/{task.subtasks.length}
                </span>
                {subtasksExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}

            <button
              type="button"
              disabled={isBreakingDown}
              onClick={() => onBreakdownSubtasks(task)}
              title="Разбить задачу на подзадачи через Gemini AI"
              className="inline-flex items-center gap-1 rounded-lg border border-violet-400/30 bg-violet-500/15 px-2.5 py-1 text-[11px] font-medium text-violet-200 transition hover:border-violet-400/60 hover:bg-violet-500/25 disabled:opacity-50"
            >
              {isBreakingDown ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-violet-300" />
                  <span>Декомпозиция...</span>
                </>
              ) : (
                <>
                  <GitBranchPlus className="h-3 w-3 text-violet-300" />
                  <span>{hasSubtasks ? "Обновить шаги ИИ" : "Разбить на подзадачи"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Subtasks List */}
        <AnimatePresence initial={false}>
          {hasSubtasks && subtasksExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="relative z-10 overflow-hidden"
            >
              <div className="mt-2.5 space-y-1.5 rounded-xl border border-white/5 bg-black/30 p-2.5">
                {task.subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => onToggleSubtask(task.id, sub.id, !sub.completed)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-xs transition hover:bg-white/5"
                  >
                    <div
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition ${
                        sub.completed
                          ? "border-cyan-400 bg-cyan-500/30 text-cyan-200"
                          : "border-white/25 bg-black/20"
                      }`}
                    >
                      {sub.completed && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs transition ${
                        sub.completed
                          ? "text-slate-500 line-through"
                          : "text-slate-200"
                      }`}
                    >
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
