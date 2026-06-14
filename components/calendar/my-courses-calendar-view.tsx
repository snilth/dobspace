"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import type { AssignmentType, Priority } from "@prisma/client";
import { cn } from "@/lib/utils";
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
  const [editAssignment, setEditAssignment] = useState<CalendarAssignment | null>(null);

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

  // ── Data ───────────────────────────────────────────────────────────────────

  const { data: assignments = [] } = useQuery({
    ...trpc.calendar.assignments.queryOptions({ year, month }),
    refetchInterval: 10_000,
    staleTime: 0,
  });

  const visibleAssignments = assignments.filter((a) => !hiddenTypes.has(a.type));

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
        title="My Courses"
        year={year}
        month={month}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        itemsByDay={itemsByDay}
        renderItem={(a) => (
          <button
            key={a.id}
            onClick={() => setEditAssignment(a)}
            className={cn(
              "w-full text-left rounded-md pl-2 pr-1.5 py-1.5 text-[11.5px] leading-snug transition-opacity hover:opacity-80 bg-surface-2 border-l-[4px]",
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
            </div>
          </button>
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
