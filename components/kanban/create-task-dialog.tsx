"use client";

import { useState, useRef } from "react";
import { X, Loader2, Zap } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { TaskStatus, BoardTask } from "./kanban-board";

const PRIORITY_OPTS = [
  { value: "LOW", label: "Low", color: "text-[oklch(42%_0.17_148)]", bg: "bg-[oklch(95%_0.05_148)] border-[oklch(85%_0.09_148)]", active: "bg-[oklch(90%_0.08_148)] border-[oklch(75%_0.12_148)]" },
  { value: "MEDIUM", label: "Medium", color: "text-[oklch(42%_0.18_55)]", bg: "bg-[oklch(96%_0.05_55)] border-[oklch(85%_0.09_55)]", active: "bg-[oklch(91%_0.08_55)] border-[oklch(75%_0.12_55)]" },
  { value: "HIGH", label: "High", color: "text-[oklch(42%_0.21_27)]", bg: "bg-[oklch(96%_0.05_27)] border-[oklch(85%_0.09_27)]", active: "bg-[oklch(91%_0.08_27)] border-[oklch(75%_0.12_27)]" },
] as const;

export function CreateTaskDialog({
  projectId,
  defaultStatus,
  onClose,
  onTaskCreated,
}: {
  projectId: string;
  defaultStatus: TaskStatus;
  onClose: () => void;
  onTaskCreated: (task: BoardTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const trpc = useTRPC();

  const createTask = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: (newTask) => {
        const firstAssignee = newTask.assignees[0]?.user ?? null;
        onTaskCreated({
          id: newTask.id,
          projectId,
          title: newTask.title,
          description: newTask.description,
          status: newTask.status as TaskStatus,
          priority: newTask.priority as BoardTask["priority"],
          tags: newTask.tags,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate) : null,
          sprintId: newTask.sprintId,
          assignee: firstAssignee,
        });
        onClose();
      },
      onError: () => {
        if (submitBtnRef.current) submitBtnRef.current.disabled = false;
      },
    })
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitBtnRef.current?.disabled) return;
    if (submitBtnRef.current) submitBtnRef.current.disabled = true;
    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    createTask.mutate({
      projectId,
      task: {
        title: title.trim(),
        status: defaultStatus,
        priority,
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        ...(parsedTags.length ? { tags: parsedTags } : {}),
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-card rounded-[16px] border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2/50">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-brand flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-brand-foreground" strokeWidth={2.5} />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Create Task</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Task name</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design ERD for Notification"
              maxLength={500}
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_OPTS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-[8px] border transition-all",
                    priority === p.value ? `${p.active} ${p.color}` : `${p.bg} ${p.color} opacity-60 hover:opacity-100`
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">
              Due date <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">
              Tags <span className="font-normal text-muted">(comma-separated, optional)</span>
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. frontend, bug, urgent"
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-9 text-sm border border-border rounded-[8px] hover:bg-surface-2 transition-colors text-foreground-2 font-medium">
              Cancel
            </button>
            <button
              type="submit"
              ref={submitBtnRef}
              disabled={!title.trim() || createTask.isPending}
              className="flex-1 h-9 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {createTask.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
