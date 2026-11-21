export type QuadrantId =
  | "urgent_important"
  | "not_urgent_important"
  | "urgent_not_important"
  | "not_urgent_not_important";

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  category: string;
  quadrant: QuadrantId;
  priorityReason: string; // До 7 слов от ИИ
  deadline: string | null;
  completed: boolean;
  createdAt: string;
  subtasks: Subtask[];
}

export interface QuadrantConfig {
  id: QuadrantId;
  title: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  glowColor: string;
  borderColor: string;
  badgeBg: string;
}

export const QUADRANTS: QuadrantConfig[] = [
  {
    id: "urgent_important",
    title: "Срочно и Важно",
    subtitle: "Сделать немедленно • Критический фокус",
    badge: "DO FIRST",
    accentColor: "text-rose-400",
    glowColor: "from-rose-500/20 via-fuchsia-500/5 to-transparent",
    borderColor: "border-rose-500/30 hover:border-rose-400/50",
    badgeBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  {
    id: "not_urgent_important",
    title: "Не срочно и Важно",
    subtitle: "Стратегия и развитие • Запланировать",
    badge: "SCHEDULE",
    accentColor: "text-cyan-400",
    glowColor: "from-cyan-500/20 via-blue-500/5 to-transparent",
    borderColor: "border-cyan-500/30 hover:border-cyan-400/50",
    badgeBg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  {
    id: "urgent_not_important",
    title: "Срочно и Не важно",
    subtitle: "Операционка и рутина • Делегировать",
    badge: "DELEGATE",
    accentColor: "text-amber-400",
    glowColor: "from-amber-500/20 via-orange-500/5 to-transparent",
    borderColor: "border-amber-500/30 hover:border-amber-400/50",
    badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  {
    id: "not_urgent_not_important",
    title: "Не срочно и Не важно",
    subtitle: "Низкий приоритет • Отложить или убрать",
    badge: "ELIMINATE",
    accentColor: "text-violet-400",
    glowColor: "from-violet-500/20 via-purple-500/5 to-transparent",
    borderColor: "border-violet-500/25 hover:border-violet-400/45",
    badgeBg: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
];
