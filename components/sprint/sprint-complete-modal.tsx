"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { X, Loader2, CheckCircle2, MoveRight, Inbox } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignees: { user: { id: string; name: string; image: string | null } }[];
};

type Props = {
  sprintId: string;
  projectId: string;
  incompleteTasks: Task[];
  onClose: () => void;
  onCompleted: () => void;
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "text-[oklch(42%_0.21_27)]",
  MEDIUM: "text-[oklch(42%_0.18_55)]",
  LOW: "text-[oklch(42%_0.17_148)]",
};

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: "Backlog", IN_PROGRESS: "In Progress", REVIEW: "Review",
};

export function SprintCompleteModal({ sprintId, projectId, incompleteTasks, onClose, onCompleted }: Props) {
  const trpc = useTRPC();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(incompleteTasks.map((t) => t.id))
  );
  const [targetSprintId, setTargetSprintId] = useState<string>("backlog");

  const { data: sprints = [] } = useQuery({
    ...trpc.sprint.list.queryOptions({ projectId }),
    select: (data) => data.filter((s) => s.id !== sprintId && s.status !== "COMPLETED"),
  });

  const complete = useMutation({
    ...trpc.sprint.complete.mutationOptions(),
    onSuccess: onCompleted,
  });

  function toggleTask(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === incompleteTasks.length
        ? new Set()
        : new Set(incompleteTasks.map((t) => t.id))
    );
  }

  function handleConfirm() {
    const carryoverTaskIds = [...selectedIds];
    complete.mutate({
      sprintId,
      carryoverTaskIds,
      targetSprintId: carryoverTaskIds.length > 0 && targetSprintId !== "backlog"
        ? targetSprintId
        : null,
    });
  }

  const allSelected = selectedIds.size === incompleteTasks.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Complete Sprint</h2>
            <p className="text-[12px] text-muted mt-0.5">
              {incompleteTasks.length} incomplete task{incompleteTasks.length !== 1 ? "s" : ""} remaining
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {incompleteTasks.length === 0 ? (
          <div className="px-5 py-8 text-center flex-1">
            <CheckCircle2 className="w-10 h-10 text-[oklch(52%_0.2_148)] mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-foreground">All tasks are done!</p>
            <p className="text-[13px] text-muted mt-1">This sprint is fully complete.</p>
          </div>
        ) : (
          <>
            {/* Carry-over destination */}
            <div className="px-5 py-3 border-b border-border flex-shrink-0 bg-surface-2/40">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Move selected tasks to</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTargetSprintId("backlog")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 h-8 rounded-lg border text-[12px] font-medium transition-colors",
                    targetSprintId === "backlog"
                      ? "bg-surface-3 border-border text-foreground"
                      : "bg-card border-border text-muted hover:text-foreground"
                  )}
                >
                  <Inbox className="w-3.5 h-3.5" /> Backlog
                </button>
                {sprints.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setTargetSprintId(s.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 h-8 rounded-lg border text-[12px] font-medium transition-colors",
                      targetSprintId === s.id
                        ? "bg-surface-3 border-border text-foreground"
                        : "bg-card border-border text-muted hover:text-foreground"
                    )}
                  >
                    <MoveRight className="w-3.5 h-3.5" />
                    {s.name}
                    <span className="text-[10px] opacity-60">
                      {s.status === "ACTIVE" ? "· Active" : "· Planning"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
                <span className="text-[12px] text-muted">{selectedIds.size} selected</span>
                <button onClick={toggleAll} className="text-[12px] text-brand hover:underline">
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {incompleteTasks.map((task) => {
                  const checked = selectedIds.has(task.id);
                  return (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-5 py-3 text-left transition-colors",
                        checked ? "bg-brand-subtle/30" : "hover:bg-surface-2"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                        checked ? "bg-brand border-brand" : "border-border"
                      )}>
                        {checked && <CheckCircle2 className="w-2.5 h-2.5 text-brand-foreground" />}
                      </div>
                      <span className={cn("text-[11px] font-bold w-12 flex-shrink-0", PRIORITY_COLOR[task.priority])}>
                        {task.priority}
                      </span>
                      <span className="flex-1 text-[13px] text-foreground truncate">{task.title}</span>
                      <span className="text-[11px] text-muted flex-shrink-0">{STATUS_LABEL[task.status] ?? task.status}</span>
                      {task.assignees[0] && (
                        <div className="w-5 h-5 rounded-full bg-surface-3 flex-shrink-0 overflow-hidden">
                          {task.assignees[0].user.image
                            ? <img src={task.assignees[0].user.image} alt="" className="w-full h-full object-cover" />
                            : <span className="w-full h-full flex items-center justify-center text-[8px] font-bold text-muted">
                                {task.assignees[0].user.name[0]}
                              </span>
                          }
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border flex-shrink-0">
          {incompleteTasks.length > 0 ? (
            <p className="text-[12px] text-muted">
              {selectedIds.size > 0
                ? `${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""} → ${targetSprintId === "backlog" ? "Backlog" : sprints.find(s => s.id === targetSprintId)?.name ?? ""}`
                : `${incompleteTasks.length - selectedIds.size} tasks stay in sprint (unassigned)`}
            </p>
          ) : <span />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={complete.isPending}
              className="h-9 px-4 rounded-lg bg-[oklch(52%_0.22_228)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {complete.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Complete Sprint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
