"use client";

import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import { Layers, Sparkles } from "lucide-react";
import { QUADRANTS, QuadrantId, TaskItem } from "@/types/task";
import { TaskCard3D } from "./TaskCard3D";

interface EisenhowerMatrixProps {
  tasks: TaskItem[];
  onMoveTask: (taskId: string, targetQuadrant: QuadrantId) => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onBreakdownSubtasks: (task: TaskItem) => Promise<void>;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
  breakingDownId: string | null;
}

export function EisenhowerMatrix({
  tasks,
  onMoveTask,
  onToggleTask,
  onDeleteTask,
  onBreakdownSubtasks,
  onToggleSubtask,
  breakingDownId,
}: EisenhowerMatrixProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const targetQuadrant = destination.droppableId as QuadrantId;
    onMoveTask(draggableId, targetQuadrant);
  };

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {QUADRANTS.map((q) => (
          <div
            key={q.id}
            className="glass-panel min-h-[300px] animate-pulse rounded-3xl border border-white/10 p-5"
          />
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
        {QUADRANTS.map((quadrant, idx) => {
          const quadrantTasks = tasks.filter((t) => t.quadrant === quadrant.id);

          return (
            <motion.div
              key={quadrant.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className={`glass-panel relative flex flex-col overflow-hidden rounded-3xl border p-5 transition-all ${quadrant.borderColor}`}
            >
              {/* Subtle Quadrant Top Gradient Glow */}
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${quadrant.glowColor}`}
              />

              {/* Quadrant Header */}
              <div className="relative z-10 mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className={`text-base font-bold sm:text-lg ${quadrant.accentColor}`}>
                      {quadrant.title}
                    </h3>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${quadrant.badgeBg}`}
                    >
                      {quadrant.badge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {quadrant.subtitle}
                  </p>
                </div>

                <div className="flex h-7 min-w-7 items-center justify-center rounded-xl border border-white/10 bg-black/40 px-2 font-mono text-xs font-semibold text-slate-200">
                  {quadrantTasks.length}
                </div>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={quadrant.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`relative z-10 flex-1 rounded-2xl transition-colors min-h-[240px] ${
                      snapshot.isDraggingOver
                        ? "bg-white/[0.04] ring-1 ring-inset ring-cyan-400/40 p-2"
                        : ""
                    }`}
                  >
                    {quadrantTasks.length === 0 ? (
                      <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-6 text-center">
                        <Layers className="mb-2 h-6 w-6 text-slate-600" />
                        <p className="text-xs font-medium text-slate-400">
                          В этом квадранте пока пусто
                        </p>
                        <p className="mt-1 max-w-[220px] text-[11px] text-slate-500">
                          Перетащите сюда задачу или используйте умный ввод Brain Dump сверху
                        </p>
                      </div>
                    ) : (
                      quadrantTasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <TaskCard3D
                              task={task}
                              provided={dragProvided}
                              snapshot={dragSnapshot}
                              onToggleTask={onToggleTask}
                              onDeleteTask={onDeleteTask}
                              onBreakdownSubtasks={onBreakdownSubtasks}
                              onToggleSubtask={onToggleSubtask}
                              isBreakingDown={breakingDownId === task.id}
                            />
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </motion.div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
