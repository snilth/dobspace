"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskEditModal } from "@/components/kanban/task-edit-modal";
import type { BoardTask } from "@/components/kanban/kanban-board";

const PROJECT_COLORS = [
  { bg: "bg-[oklch(91%_0.06_228)]", dot: "bg-[oklch(52%_0.22_228)]", text: "text-[oklch(35%_0.18_228)]" },
  { bg: "bg-[oklch(91%_0.06_148)]", dot: "bg-[oklch(52%_0.2_148)]",  text: "text-[oklch(35%_0.17_148)]" },
  { bg: "bg-[oklch(93%_0.06_55)]",  dot: "bg-[oklch(58%_0.2_55)]",   text: "text-[oklch(38%_0.16_55)]"  },
  { bg: "bg-[oklch(93%_0.06_27)]",  dot: "bg-[oklch(55%_0.22_27)]",  text: "text-[oklch(38%_0.18_27)]"  },
  { bg: "bg-[oklch(92%_0.06_310)]", dot: "bg-[oklch(52%_0.2_310)]",  text: "text-[oklch(35%_0.17_310)]" },
  { bg: "bg-[oklch(92%_0.05_180)]", dot: "bg-[oklch(52%_0.18_180)]", text: "text-[oklch(35%_0.15_180)]" },
];

const PRIORITY_DOT: Record<string, string> = {
  HIGH:   "bg-[oklch(55%_0.22_27)]",
  MEDIUM: "bg-[oklch(58%_0.2_55)]",
  LOW:    "bg-[oklch(52%_0.2_148)]",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type CalendarTask = {
  id: string; title: string; description?: string | null;
  status: "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH"; tags: string[];
  dueDate: string; sprintId?: string | null; projectId: string;
  project: { id: string; name: string };
  assignee: { id: string; name: string; image: string | null; tag: string | null } | null;
};

export function CalendarView({ workspaceId }: { workspaceId: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());
  const [editTask, setEditTask] = useState<CalendarTask | null>(null);

  const trpc = useTRPC();
  const { data: tasks = [] } = useQuery(
    trpc.calendar.tasks.queryOptions({ workspaceId, year, month })
  );

  // Assign stable color index per project
  const projectColorMap = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => {
      if (!map.has(t.project.id)) map.set(t.project.id, map.size % PROJECT_COLORS.length);
    });
    return map;
  }, [tasks]);

  const projects = useMemo(() => {
    const seen = new Map<string, string>();
    tasks.forEach((t) => seen.set(t.project.id, t.project.name));
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const visibleTasks = tasks.filter((t) => !hiddenProjects.has(t.project.id));

  // Build day → tasks map
  const tasksByDay = useMemo(() => {
    const map = new Map<number, CalendarTask[]>();
    visibleTasks.forEach((t) => {
      const d = new Date(t.dueDate).getDate();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    });
    return map;
  }, [visibleTasks]);

  // Calendar grid
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function toggleProject(id: string) {
    setHiddenProjects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-semibold text-foreground">Calendar</h1>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[14px] font-medium text-foreground min-w-[140px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project filter */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {projects.map((p) => {
              const ci = projectColorMap.get(p.id) ?? 0;
              const color = PROJECT_COLORS[ci];
              const hidden = hiddenProjects.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleProject(p.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all",
                    hidden
                      ? "bg-surface-2 text-muted border-border opacity-50"
                      : `${color.bg} ${color.text} border-transparent`
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", hidden ? "bg-muted" : color.dot)} />
                  {p.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: "minmax(100px, 1fr)" }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const day = i - firstWeekday + 1;
            const isValid = day >= 1 && day <= daysInMonth;
            const dayTasks = isValid ? (tasksByDay.get(day) ?? []) : [];

            return (
              <div
                key={i}
                className={cn(
                  "border-b border-r border-border p-1.5 min-h-[100px]",
                  !isValid && "bg-surface-2/30",
                  isToday(day) && isValid && "bg-brand/3"
                )}
              >
                {isValid && (
                  <>
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium mb-1 ml-0.5",
                      isToday(day)
                        ? "bg-brand text-brand-foreground"
                        : "text-foreground"
                    )}>
                      {day}
                    </div>

                    <div className="flex flex-col gap-1">
                      {dayTasks.map((task) => {
                        const ci = projectColorMap.get(task.project.id) ?? 0;
                        const color = PROJECT_COLORS[ci];
                        return (
                          <button
                            key={task.id}
                            onClick={() => setEditTask(task)}
                            className={cn(
                              "w-full text-left rounded-md px-1.5 py-1 text-[11px] leading-tight transition-opacity hover:opacity-80",
                              color.bg, color.text
                            )}
                          >
                            <div className="flex items-start gap-1">
                              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5", PRIORITY_DOT[task.priority])} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{task.title}</p>
                                <p className="opacity-70 truncate">{task.project.name}</p>
                              </div>
                              {task.assignee?.image && (
                                <img
                                  src={task.assignee.image}
                                  alt={task.assignee.name}
                                  className="w-4 h-4 rounded-full flex-shrink-0 object-cover"
                                />
                              )}
                              {task.assignee && !task.assignee.image && (
                                <div className="w-4 h-4 rounded-full flex-shrink-0 bg-surface-3 flex items-center justify-center">
                                  <span className="text-[8px] font-bold text-muted">
                                    {task.assignee.name.slice(0, 1).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Task edit modal */}
      {editTask && (
        <TaskEditModal
          task={editTask as BoardTask}
          workspaceId={workspaceId}
          canAssign
          onClose={() => setEditTask(null)}
          onUpdated={() => setEditTask(null)}
        />
      )}
    </div>
  );
}
