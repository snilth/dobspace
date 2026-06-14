"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { TaskEditModal } from "@/components/kanban/task-edit-modal";
import type { BoardTask } from "@/components/kanban/kanban-board";
import { CalendarGrid } from "./calendar-grid";

const PROJECT_COLORS = [
  { bg: "bg-[oklch(91%_0.06_228)]", dot: "bg-[oklch(52%_0.22_228)]", text: "text-[oklch(35%_0.18_228)]" },
  { bg: "bg-[oklch(91%_0.06_148)]", dot: "bg-[oklch(52%_0.2_148)]",  text: "text-[oklch(35%_0.17_148)]" },
  { bg: "bg-[oklch(93%_0.06_55)]",  dot: "bg-[oklch(58%_0.2_55)]",   text: "text-[oklch(38%_0.16_55)]"  },
  { bg: "bg-[oklch(93%_0.06_27)]",  dot: "bg-[oklch(55%_0.22_27)]",  text: "text-[oklch(38%_0.18_27)]"  },
  { bg: "bg-[oklch(92%_0.06_310)]", dot: "bg-[oklch(52%_0.2_310)]",  text: "text-[oklch(35%_0.17_310)]" },
  { bg: "bg-[oklch(92%_0.05_180)]", dot: "bg-[oklch(52%_0.18_180)]", text: "text-[oklch(35%_0.15_180)]" },
];

const PRIORITY_DOT: Record<string, string> = {
  HIGH:   "bg-[oklch(50%_0.28_15)]",
  MEDIUM: "bg-[oklch(72%_0.18_85)]",
  LOW:    "bg-[oklch(55%_0.18_148)]",
};

const STATUS_BORDER: Record<string, string> = {
  IN_PROGRESS: "border-l-[4px] border-l-[oklch(45%_0.25_228)]",
  REVIEW:      "border-l-[4px] border-l-[oklch(52%_0.22_55)]",
  BACKLOG:     "border-l-[4px] border-l-[oklch(55%_0.04_258)]",
};

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
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [editTask, setEditTask] = useState<CalendarTask | null>(null);

  const trpc        = useTRPC();
  const queryClient = useQueryClient();

  function handleTaskUpdated() {
    setEditTask(null);
    queryClient.invalidateQueries({ queryKey: trpc.calendar.tasks.queryKey({ workspaceId, year, month }) });
  }

  const { data: tasks = [] } = useQuery({
    ...trpc.calendar.tasks.queryOptions({ workspaceId, year, month }),
    refetchInterval: 10_000,
    staleTime: 0,
  });

  const projectColorMap = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => {
      if (!map.has(t.project.id)) map.set(t.project.id, map.size % PROJECT_COLORS.length);
    });
    return map;
  }, [tasks]);

  const tasksByDay = useMemo(() => {
    const map = new Map<number, CalendarTask[]>();
    tasks.forEach((t) => {
      const d = new Date(t.dueDate).getDate();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    });
    return map;
  }, [tasks]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="flex flex-col h-full">
      <CalendarGrid
        title="Calendar"
        year={year}
        month={month}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        itemsByDay={tasksByDay}
        renderItem={(task) => {
          const ci = projectColorMap.get(task.project.id) ?? 0;
          const color = PROJECT_COLORS[ci];
          return (
            <button
              key={task.id}
              onClick={() => setEditTask(task)}
              className={cn(
                "w-full text-left rounded-md pl-2 pr-1.5 py-1.5 text-[11.5px] leading-snug transition-opacity hover:opacity-80",
                color.bg, color.text,
                STATUS_BORDER[task.status]
              )}
            >
              <div className="flex items-start gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[3px]", PRIORITY_DOT[task.priority])} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{task.title}</p>
                  <p className="opacity-60 truncate text-[11px] mt-0.5">{task.project.name}</p>
                </div>
                {task.assignee?.image && (
                  <img src={task.assignee.image} alt={task.assignee.name} className="w-4 h-4 rounded-full flex-shrink-0 object-cover" />
                )}
                {task.assignee && !task.assignee.image && (
                  <div className="w-4 h-4 rounded-full flex-shrink-0 bg-surface-3 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-muted">{task.assignee.name.slice(0, 1).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </button>
          );
        }}
      />

      {editTask && (
        <TaskEditModal
          task={editTask as unknown as BoardTask}
          workspaceId={workspaceId}
          canAssign
          onClose={() => setEditTask(null)}
          onUpdated={handleTaskUpdated}
        />
      )}
    </div>
  );
}
