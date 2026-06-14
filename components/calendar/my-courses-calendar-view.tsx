"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import type { AssignmentType, Priority } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, Pencil, Trash2, X } from "lucide-react";
import { CalendarGrid } from "./calendar-grid";
import { AssignmentModal } from "@/app/(dashboard)/courses/[id]/assignment-modal";
import { TYPE_LABEL } from "@/app/(dashboard)/courses/[id]/assignment-list";

const PRIORITY_DOT: Record<Priority, string> = {
  HIGH: "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW: "bg-priority-low",
};

const TYPE_OPTIONS: { value: AssignmentType; label: string; bar: string }[] = [
  { value: "HOMEWORK",     label: "Homework",     bar: "bg-[oklch(57%_0.21_228)]" },
  { value: "EXAM",         label: "Exam",         bar: "bg-[oklch(54%_0.23_27)]"  },
  { value: "QUIZ",         label: "Quiz",         bar: "bg-[oklch(58%_0.18_300)]" },
  { value: "MINI_PROJECT", label: "Mini Project", bar: "bg-[oklch(57%_0.2_148)]"  },
];

type CalendarAssignment = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  reminder: string | null;
  type: AssignmentType;
  priority: Priority;
  done: boolean;
  course: { id: string; name: string; color: string };
};

export function MyCoursesCalendarView() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [hiddenTypes, setHiddenTypes] = useState<Set<AssignmentType>>(new Set());
  const [appliedFilter, setAppliedFilter] = useState<AssignmentType[] | null>(null);
  const [hiddenCourses, setHiddenCourses] = useState<Set<string>>(new Set());
  const [courseDropOpen, setCourseDropOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<CalendarAssignment | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const courseDropRef = useRef<HTMLDivElement>(null);

  const trpc        = useTRPC();
  const queryClient = useQueryClient();

  // ── Persistence ────────────────────────────────────────────────────────────

  const filterQuery = useQuery(trpc.userPrefs.getPersonalCalendarFilter.queryOptions());
  const filterMutation = useMutation(trpc.userPrefs.setPersonalCalendarFilter.mutationOptions());

  if (filterQuery.data != null && filterQuery.data !== appliedFilter) {
    setAppliedFilter(filterQuery.data);
    setHiddenTypes(new Set(filterQuery.data));
  }

  function toggleType(type: AssignmentType) {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      filterMutation.mutate({ hiddenTypes: [...next] });
      return next;
    });
  }

  function toggleCourse(id: string) {
    setHiddenCourses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Close dropdown on outside click ─────────────────────────────────────────

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (courseDropRef.current && !courseDropRef.current.contains(e.target as Node))
        setCourseDropOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────

  const { data: assignments = [] } = useQuery({
    ...trpc.calendar.assignments.queryOptions({ year, month }),
    refetchInterval: 10_000,
    staleTime: 0,
  });

  const deleteAssignment = useMutation(trpc.assignments.delete.mutationOptions({
    onSuccess: () => {
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: trpc.calendar.assignments.queryKey({ year, month }) });
    },
  }));

  const courses = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; color: string }>();
    assignments.forEach((a) => {
      if (!seen.has(a.course.id)) seen.set(a.course.id, a.course);
    });
    return [...seen.values()];
  }, [assignments]);

  const visibleAssignments = assignments.filter(
    (a) => !hiddenTypes.has(a.type) && !hiddenCourses.has(a.course.id)
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<number, CalendarAssignment[]>();
    visibleAssignments.forEach((a) => {
      const d = new Date(a.dueDate).getDate();
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(a);
    });
    return map;
  }, [visibleAssignments]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function handleAssignmentChanged() {
    setEditAssignment(null);
    queryClient.invalidateQueries({ queryKey: trpc.calendar.assignments.queryKey({ year, month }) });
  }

  return (
    <div className="flex flex-col h-full">
      <CalendarGrid
        title="Courses"
        year={year}
        month={month}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        itemsByDay={itemsByDay}
        renderItem={(a) => (
          <div
            key={a.id}
            onClick={() => setEditAssignment(a)}
            className={cn(
              "group relative w-full text-left rounded-md pl-2 pr-1.5 py-1.5 text-[11.5px] leading-snug cursor-pointer transition-opacity hover:opacity-80 bg-surface-2 border-l-[4px]",
              a.done && "opacity-50"
            )}
            style={{ borderLeftColor: a.course.color }}
          >
            <div className="flex items-start gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[3px]", PRIORITY_DOT[a.priority])} />
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold truncate", a.done && "line-through")}>{a.title}</p>
                <p className="opacity-60 truncate text-[11px] mt-0.5">{a.course.name} · {TYPE_LABEL[a.type]}</p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {confirmDeleteId === a.id ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteAssignment.mutate({ id: a.id }); }}
                      disabled={deleteAssignment.isPending}
                      className="h-5 px-1.5 rounded-md text-[9px] font-bold bg-error text-white transition-colors"
                    >
                      Delete?
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-muted hover:bg-surface-3 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditAssignment(a); }}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-muted hover:text-brand hover:bg-brand-subtle transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(a.id); }}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-muted hover:text-error hover:bg-[oklch(96%_0.03_27)] transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        headerExtra={
          <>
            {TYPE_OPTIONS.map((t) => {
              const active = !hiddenTypes.has(t.value);
              return (
                <button
                  key={t.value}
                  onClick={() => toggleType(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 h-8 rounded-lg border text-[13px] font-medium transition-colors",
                    active
                      ? "bg-surface-3 border-border text-foreground"
                      : "bg-card border-border text-muted hover:text-foreground hover:bg-surface-2 opacity-50"
                  )}
                >
                  <span className={cn("w-[3px] h-4 rounded-full", active ? t.bar : "bg-muted")} />
                  {t.label}
                </button>
              );
            })}

            {/* Course filter dropdown */}
            {courses.length > 1 && (
              <div className="relative" ref={courseDropRef}>
                <button
                  onClick={() => setCourseDropOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 h-8 rounded-lg border border-border bg-card hover:bg-surface-2 text-[13px] text-foreground transition-colors"
                >
                  <span>
                    {hiddenCourses.size === 0
                      ? "All courses"
                      : `${courses.length - hiddenCourses.size} / ${courses.length}`}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted" />
                </button>

                {courseDropOpen && (
                  <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-border bg-card shadow-lg py-1.5">
                    <div className="flex items-center justify-between px-3 pb-1.5 mb-1 border-b border-border">
                      <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Courses</span>
                      <button
                        onClick={() => setHiddenCourses(new Set())}
                        className="text-[11px] text-brand hover:underline"
                      >
                        Show all
                      </button>
                    </div>
                    {courses.map((c) => {
                      const visible = !hiddenCourses.has(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCourse(c.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface-2 transition-colors text-left"
                        >
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                          <span className={cn("flex-1 text-[13px] truncate", visible ? "text-foreground" : "text-muted line-through")}>
                            {c.name}
                          </span>
                          {visible && <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        }
      />

      {editAssignment && (
        <AssignmentModal
          assignment={{
            id: editAssignment.id,
            title: editAssignment.title,
            description: editAssignment.description,
            dueDate: new Date(editAssignment.dueDate),
            reminder: editAssignment.reminder,
            type: editAssignment.type,
            priority: editAssignment.priority,
            done: editAssignment.done,
          }}
          onClose={() => setEditAssignment(null)}
          onSaved={handleAssignmentChanged}
          onDeleted={handleAssignmentChanged}
        />
      )}
    </div>
  );
}
