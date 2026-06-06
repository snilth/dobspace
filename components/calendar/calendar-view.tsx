"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";
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
  HIGH:   "bg-[oklch(50%_0.28_15)]",
  MEDIUM: "bg-[oklch(72%_0.18_85)]",
  LOW:    "bg-[oklch(55%_0.18_148)]",
};

const STATUS_BORDER: Record<string, string> = {
  IN_PROGRESS: "border-l-[4px] border-l-[oklch(45%_0.25_228)]",
  REVIEW:      "border-l-[4px] border-l-[oklch(52%_0.22_55)]",
  BACKLOG:     "border-l-[4px] border-l-[oklch(55%_0.04_258)]",
};

const STATUS_OPTIONS = [
  { value: "BACKLOG",     label: "Backlog",     dot: "bg-[oklch(55%_0.04_258)]" },
  { value: "IN_PROGRESS", label: "In Progress", dot: "bg-[oklch(45%_0.25_228)]" },
  { value: "REVIEW",      label: "Review",      dot: "bg-[oklch(52%_0.22_55)]"  },
] as const;

// Hidden by default — user can override; persisted in DB
const DEFAULT_HIDDEN: string[] = ["BACKLOG"];

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

function cacheKey(workspaceId: string) {
  return `calendar-status-filter:${workspaceId}`;
}
function readCache(workspaceId: string): string[] | null {
  try {
    const v = localStorage.getItem(cacheKey(workspaceId));
    return v ? (JSON.parse(v) as string[]) : null;
  } catch { return null; }
}
function writeCache(workspaceId: string, hidden: string[]) {
  try { localStorage.setItem(cacheKey(workspaceId), JSON.stringify(hidden)); } catch {}
}

export function CalendarView({ workspaceId }: { workspaceId: string }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // Always start with default (SSR-safe). Read localStorage + DB after mount.
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(new Set(DEFAULT_HIDDEN));
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());

  const [projectDropOpen, setProjectDropOpen] = useState(false);
  const [editTask, setEditTask] = useState<CalendarTask | null>(null);

  const projectDropRef = useRef<HTMLDivElement>(null);

  const trpc        = useTRPC();
  const queryClient = useQueryClient();

  // ── Persistence ────────────────────────────────────────────────────────────

  const filterQuery = useQuery(
    trpc.userPrefs.getCalendarFilter.queryOptions({ workspaceId })
  );
  const filterMutation = useMutation(
    trpc.userPrefs.setCalendarFilter.mutationOptions()
  );

  // After mount: apply localStorage cache immediately (avoids SSR mismatch)
  useEffect(() => {
    const cached = readCache(workspaceId);
    if (cached !== null) setHiddenStatuses(new Set(cached));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When DB resolves: DB value wins (enables cross-device sync)
  useEffect(() => {
    if (filterQuery.data != null) {
      setHiddenStatuses(new Set(filterQuery.data));
      writeCache(workspaceId, filterQuery.data);
    }
  }, [filterQuery.data, workspaceId]);

  function applyStatusToggle(status: string) {
    setHiddenStatuses((prev) => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      const hidden = [...next] as ("BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE")[];
      writeCache(workspaceId, hidden);
      filterMutation.mutate({ workspaceId, hiddenStatuses: hidden });
      return next;
    });
  }

  // ── Close dropdowns on outside click ───────────────────────────────────────

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (projectDropRef.current && !projectDropRef.current.contains(e.target as Node))
        setProjectDropOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────

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

  const projects = useMemo(() => {
    const seen = new Map<string, string>();
    tasks.forEach((t) => seen.set(t.project.id, t.project.name));
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const visibleTasks = tasks.filter(
    (t) => !hiddenProjects.has(t.project.id) && !hiddenStatuses.has(t.status)
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<number, CalendarTask[]>();
    visibleTasks.forEach((t) => {
      const d = new Date(t.dueDate).getDate();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    });
    return map;
  }, [visibleTasks]);

  const daysInMonth  = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const totalCells   = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

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

        <div className="flex items-center gap-2">

          {/* Status filter buttons */}
          {STATUS_OPTIONS.map((s) => {
            const active = !hiddenStatuses.has(s.value);
            return (
              <button
                key={s.value}
                onClick={() => applyStatusToggle(s.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-8 rounded-lg border text-[13px] font-medium transition-colors",
                  active
                    ? "bg-surface-3 border-border text-foreground"
                    : "bg-card border-border text-muted hover:text-foreground hover:bg-surface-2 opacity-50"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", active ? s.dot : "bg-muted")} />
                {s.label}
              </button>
            );
          })}

          {/* Project filter dropdown */}
          {projects.length > 0 && (
            <div className="relative" ref={projectDropRef}>
              <button
                onClick={() => setProjectDropOpen((v) => !v)}
                className="flex items-center gap-2 px-3 h-8 rounded-lg border border-border bg-card hover:bg-surface-2 text-[13px] text-foreground transition-colors"
              >
                <span>
                  {hiddenProjects.size === 0
                    ? "All projects"
                    : `${projects.length - hiddenProjects.size} / ${projects.length}`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted" />
              </button>

              {projectDropOpen && (
                <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-border bg-card shadow-lg py-1.5">
                  <div className="flex items-center justify-between px-3 pb-1.5 mb-1 border-b border-border">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Projects</span>
                    <button
                      onClick={() => setHiddenProjects(new Set())}
                      className="text-[11px] text-brand hover:underline"
                    >
                      Show all
                    </button>
                  </div>
                  {projects.map((p) => {
                    const ci = projectColorMap.get(p.id) ?? 0;
                    const color = PROJECT_COLORS[ci];
                    const visible = !hiddenProjects.has(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleProject(p.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-2 transition-colors text-left"
                      >
                        <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", color.dot)} />
                        <span className={cn("flex-1 text-[13px] truncate", visible ? "text-foreground" : "text-muted line-through")}>
                          {p.name}
                        </span>
                        {visible && <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 overflow-hidden" style={{ flex: 1, gridTemplateRows: `repeat(${totalCells / 7}, minmax(0, 1fr))` }}>
          {Array.from({ length: totalCells }, (_, i) => {
            const day = i - firstWeekday + 1;
            const isValid = day >= 1 && day <= daysInMonth;
            const dayTasks = isValid ? (tasksByDay.get(day) ?? []) : [];

            return (
              <div
                key={i}
                className={cn(
                  "border-b border-r border-border flex flex-col overflow-hidden",
                  !isValid && "bg-surface-2/30",
                  isToday(day) && isValid && "bg-brand/3"
                )}
              >
                {isValid && (
                  <>
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium flex-shrink-0 mt-2 ml-2 mb-1",
                      isToday(day) ? "bg-brand text-brand-foreground" : "text-foreground"
                    )}>
                      {day}
                    </div>
                    <div className="flex flex-col gap-1.5 overflow-y-auto px-2 pb-2 flex-1 min-h-0">
                      {dayTasks.map((task) => {
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
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
