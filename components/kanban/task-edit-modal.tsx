"use client";

import { useState } from "react";
import { X, Loader2, UserCircle2, ChevronDown, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { BoardTask } from "./kanban-board";

const PRIORITY_OPTS = [
  { value: "LOW", label: "Low", color: "text-[oklch(42%_0.17_148)]", bg: "bg-[oklch(95%_0.05_148)] border-[oklch(85%_0.09_148)]", active: "bg-[oklch(90%_0.08_148)] border-[oklch(75%_0.12_148)]" },
  { value: "MEDIUM", label: "Medium", color: "text-[oklch(42%_0.18_55)]", bg: "bg-[oklch(96%_0.05_55)] border-[oklch(85%_0.09_55)]", active: "bg-[oklch(91%_0.08_55)] border-[oklch(75%_0.12_55)]" },
  { value: "HIGH", label: "High", color: "text-[oklch(42%_0.21_27)]", bg: "bg-[oklch(96%_0.05_27)] border-[oklch(85%_0.09_27)]", active: "bg-[oklch(91%_0.08_27)] border-[oklch(75%_0.12_27)]" },
] as const;

type Props = {
  task: BoardTask;
  workspaceId?: string;
  canAssign?: boolean;
  onClose: () => void;
  onUpdated: (task: BoardTask) => void;
};

export function TaskEditModal({ task, workspaceId = "", canAssign = false, onClose, onUpdated }: Props) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  );
  const [tags, setTags] = useState(task.tags.join(", "));
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: projectMembers = [] } = useQuery({
    ...trpc.projects.members.queryOptions({ projectId: task.projectId, workspaceId }),
    enabled: canAssign && assigneePickerOpen,
  });

  const updateTask = useMutation(trpc.tasks.update.mutationOptions({
    onSuccess: (updated) => {
      onUpdated({
        ...task,
        title: updated.title,
        priority: updated.priority as BoardTask["priority"],
        tags: updated.tags,
        dueDate: updated.dueDate ? new Date(updated.dueDate) : null,
        assignee: updated.assignees[0]?.user ?? null,
      });
    },
  }));

  const addAssignee = useMutation(trpc.tasks.addAssignee.mutationOptions({
    onSuccess: (assignee) => {
      onUpdated({ ...task, assignee: { ...assignee.user } });
      setAssigneePickerOpen(false);
    },
  }));

  const removeAssignee = useMutation(trpc.tasks.removeAssignee.mutationOptions({
    onSuccess: () => {
      onUpdated({ ...task, assignee: null });
    },
  }));

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    updateTask.mutate({
      id: task.id,
      data: {
        title: title.trim(),
        priority,
        tags: parsedTags,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-md bg-card rounded-[16px] border border-border shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2/50">
          <h2 className="text-[14px] font-semibold text-foreground">Edit Task</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Task name</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_OPTS.map((p) => (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                  className={cn("flex-1 py-2 text-xs font-semibold rounded-[8px] border transition-all",
                    priority === p.value ? `${p.active} ${p.color}` : `${p.bg} ${p.color} opacity-60 hover:opacity-100`
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee — MANAGER only */}
          {canAssign && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">Assignee</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAssigneePickerOpen((o) => !o)}
                  className="w-full h-10 px-3 flex items-center gap-2.5 bg-surface border border-border rounded-[8px] hover:border-brand/40 transition-colors text-left"
                >
                  {task.assignee ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-brand">{task.assignee.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <span className="flex-1 text-sm text-foreground truncate">{task.assignee.name}</span>
                      {task.assignee.tag && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-subtle text-brand border border-brand-muted flex-shrink-0">
                          {task.assignee.tag}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <UserCircle2 className="w-5 h-5 text-muted-2 flex-shrink-0" />
                      <span className="flex-1 text-sm text-muted-2">Unassigned</span>
                    </>
                  )}
                  <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
                </button>

                {assigneePickerOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-[10px] shadow-lg z-10 overflow-hidden">
                    {task.assignee && (
                      <button
                        type="button"
                        onClick={() => {
                          removeAssignee.mutate({ taskId: task.id, userId: task.assignee!.id });
                          setAssigneePickerOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-2 transition-colors text-left border-b border-border"
                      >
                        <UserCircle2 className="w-5 h-5 text-muted-2 flex-shrink-0" />
                        <span className="text-[13px] text-muted">Unassign</span>
                      </button>
                    )}

                    <div className="max-h-48 overflow-y-auto">
                      {projectMembers.length === 0 ? (
                        <p className="text-[12px] text-muted text-center py-4">No members</p>
                      ) : (
                        projectMembers.map((m) => {
                          const isCurrentAssignee = task.assignee?.id === m.user.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                if (!isCurrentAssignee) {
                                  addAssignee.mutate({ taskId: task.id, userId: m.user.id });
                                } else {
                                  setAssigneePickerOpen(false);
                                }
                              }}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-2 transition-colors text-left",
                                isCurrentAssignee && "bg-brand-subtle/50"
                              )}
                            >
                              <div className="w-6 h-6 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0">
                                <span className="text-[9px] font-bold text-brand">{m.user.name.slice(0, 2).toUpperCase()}</span>
                              </div>
                              <span className="flex-1 text-[13px] text-foreground truncate">{m.user.name}</span>
                              {m.tag && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-subtle text-brand border border-brand-muted flex-shrink-0">
                                  {m.tag}
                                </span>
                              )}
                              {isCurrentAssignee && <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all text-foreground" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Tags <span className="font-normal text-muted">(comma-separated)</span></label>
            <input value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. frontend, bug, urgent"
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-9 border border-border rounded-[8px] text-sm font-medium text-foreground-2 hover:bg-surface-2 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim() || updateTask.isPending}
              className="flex-1 h-9 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              {updateTask.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
