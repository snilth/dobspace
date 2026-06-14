"use client";

import { useState } from "react";
import { Check, Plus, Bell } from "lucide-react";
import type { AssignmentType, Priority } from "@prisma/client";
import { cn } from "@/lib/utils";
import { type Assignment, TYPE_LABEL, PRIORITY_LABEL } from "./assignment-list";
import { AssignmentCreateDialog } from "./assignment-create-dialog";

const TYPE_ORDER: AssignmentType[] = ["HOMEWORK", "EXAM", "QUIZ", "MINI_PROJECT"];

const TYPE_STYLE: Record<AssignmentType, { dot: string; bg: string; headerText: string; countBg: string }> = {
  HOMEWORK:     { dot: "oklch(57% 0.21 228)", bg: "bg-[oklch(97%_0.02_228)]", headerText: "text-[oklch(40%_0.18_228)]", countBg: "bg-[oklch(91%_0.04_228)] text-[oklch(42%_0.18_228)]" },
  EXAM:         { dot: "oklch(54% 0.23 27)",  bg: "bg-[oklch(97%_0.02_27)]",  headerText: "text-[oklch(42%_0.21_27)]",  countBg: "bg-[oklch(93%_0.04_27)] text-[oklch(44%_0.21_27)]"  },
  QUIZ:         { dot: "oklch(58% 0.18 300)", bg: "bg-[oklch(97%_0.02_300)]", headerText: "text-[oklch(42%_0.18_300)]", countBg: "bg-[oklch(91%_0.04_300)] text-[oklch(42%_0.18_300)]" },
  MINI_PROJECT: { dot: "oklch(57% 0.2 148)",  bg: "bg-[oklch(97%_0.02_148)]", headerText: "text-[oklch(38%_0.17_148)]", countBg: "bg-[oklch(91%_0.05_148)] text-[oklch(40%_0.17_148)]" },
};

const PRIORITY_BAR: Record<Priority, string> = {
  LOW: "bg-priority-low",
  MEDIUM: "bg-priority-medium",
  HIGH: "bg-priority-high",
};

const PRIORITY_BADGE: Record<Priority, string> = {
  HIGH: "bg-[oklch(96%_0.05_27)] text-[oklch(42%_0.21_27)]",
  MEDIUM: "bg-[oklch(96%_0.05_55)] text-[oklch(42%_0.18_55)]",
  LOW: "bg-[oklch(95%_0.05_148)] text-[oklch(42%_0.17_148)]",
};

export function AssignmentBoard({ courseId, assignments, onToggle, onEdit, onCreated }: {
  courseId: string;
  assignments: Assignment[];
  onToggle: (id: string, done: boolean) => void;
  onEdit: (a: Assignment) => void;
  onCreated: (a: Assignment) => void;
}) {
  const [addingType, setAddingType] = useState<AssignmentType | null>(null);

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {addingType && (
        <AssignmentCreateDialog
          courseId={courseId}
          type={addingType}
          onCreated={onCreated}
          onClose={() => setAddingType(null)}
        />
      )}
      {TYPE_ORDER.map((type) => {
        const group = assignments.filter((a) => a.type === type);
        const pending = group.filter((a) => !a.done);
        const done = group.filter((a) => a.done);
        const style = TYPE_STYLE[type];
        const isAdding = addingType === type;

        return (
          <div key={type} className="flex flex-col flex-1 min-w-72">
            <div className={cn("flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl mb-2", style.bg)}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: style.dot }} />
                <span className={cn("text-[13px] font-semibold truncate", style.headerText)}>{TYPE_LABEL[type]}</span>
                <span className={cn("text-[11px] px-1.5 py-0.5 rounded-md font-semibold shrink-0", style.countBg)}>{group.length}</span>
              </div>
              <button
                onClick={() => setAddingType(isAdding ? null : type)}
                aria-label={`Add ${TYPE_LABEL[type]} assignment`}
                className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-black/8 shrink-0", style.headerText)}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {pending.map((a) => (
                <AssignmentCard key={a.id} assignment={a} onToggle={() => onToggle(a.id, true)} onEdit={() => onEdit(a)} />
              ))}
              {done.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider pt-1">Done · {done.length}</p>
                  {done.map((a) => (
                    <AssignmentCard key={a.id} assignment={a} onToggle={() => onToggle(a.id, false)} onEdit={() => onEdit(a)} />
                  ))}
                </>
              )}
              {group.length === 0 && !isAdding && (
                <button
                  onClick={() => setAddingType(type)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-border text-xs text-muted hover:border-brand/30 hover:text-brand hover:bg-brand-subtle transition-all"
                >
                  + Add task
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssignmentCard({ assignment, onToggle, onEdit }: { assignment: Assignment; onToggle: () => void; onEdit: () => void }) {
  const overdue = !assignment.done && new Date(assignment.dueDate) < new Date();

  return (
    <div
      onClick={onEdit}
      className="group relative bg-card border border-border rounded-[10px] pl-3.5 pr-2.5 py-2.5 cursor-pointer hover:border-brand/30 hover:shadow-[0_4px_12px_-4px_oklch(0%_0_0/10%)] transition-all"
    >
      <div className={cn("absolute left-0 top-2 bottom-2 w-0.75 rounded-r-full", PRIORITY_BAR[assignment.priority])} />

      <div className="flex items-start gap-2 mb-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-pressed={assignment.done}
          aria-label={assignment.done ? "Mark as not done" : "Mark as done"}
          className={cn(
            "w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
            assignment.done ? "bg-brand border-brand" : "border-border hover:border-brand"
          )}
        >
          {assignment.done && <Check className="w-2.5 h-2.5 text-brand-foreground" strokeWidth={3} />}
        </button>
        <p className={cn("flex-1 min-w-0 text-[12px] font-medium leading-snug", assignment.done ? "text-muted line-through" : "text-foreground")}>
          {assignment.title}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0", PRIORITY_BADGE[assignment.priority])}>
          {PRIORITY_LABEL[assignment.priority]}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {assignment.reminder && (
            <span title={assignment.reminder}>
              <Bell className="w-3 h-3 text-muted" />
            </span>
          )}
          <span className={cn("text-[10px]", overdue ? "text-error font-semibold" : "text-muted")}>
            {new Date(assignment.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}
