"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { AssigneeDropdown } from "./assignee-dropdown";
import { MentionTextarea } from "@/components/shared/mention-textarea";
import { DatePicker } from "@/components/shared/date-picker";
import type { BoardTask, TaskStatus } from "./kanban-board";

const PRIORITY_OPTS = [
  { value: "LOW", label: "Low", color: "text-[oklch(42%_0.17_148)]", bg: "bg-[oklch(95%_0.05_148)] border-[oklch(85%_0.09_148)]", active: "bg-[oklch(90%_0.08_148)] border-[oklch(75%_0.12_148)]" },
  { value: "MEDIUM", label: "Medium", color: "text-[oklch(42%_0.18_55)]", bg: "bg-[oklch(96%_0.05_55)] border-[oklch(85%_0.09_55)]", active: "bg-[oklch(91%_0.08_55)] border-[oklch(75%_0.12_55)]" },
  { value: "HIGH", label: "High", color: "text-[oklch(42%_0.21_27)]", bg: "bg-[oklch(96%_0.05_27)] border-[oklch(85%_0.09_27)]", active: "bg-[oklch(91%_0.08_27)] border-[oklch(75%_0.12_27)]" },
] as const;

const STATUS_OPTS = [
  { value: "BACKLOG", label: "Backlog", color: "text-[oklch(42%_0.01_258)]", bg: "bg-[oklch(96%_0.004_258)] border-[oklch(88%_0.006_258)]", active: "bg-[oklch(91%_0.006_258)] border-[oklch(78%_0.01_258)]" },
  { value: "IN_PROGRESS", label: "In Progress", color: "text-[oklch(40%_0.18_228)]", bg: "bg-[oklch(95%_0.04_228)] border-[oklch(85%_0.08_228)]", active: "bg-[oklch(90%_0.07_228)] border-[oklch(75%_0.12_228)]" },
  { value: "REVIEW", label: "In Review", color: "text-[oklch(42%_0.17_55)]", bg: "bg-[oklch(96%_0.04_55)] border-[oklch(85%_0.09_55)]", active: "bg-[oklch(91%_0.07_55)] border-[oklch(75%_0.12_55)]" },
  { value: "DONE", label: "Done", color: "text-[oklch(38%_0.17_148)]", bg: "bg-[oklch(95%_0.04_148)] border-[oklch(85%_0.08_148)]", active: "bg-[oklch(90%_0.07_148)] border-[oklch(75%_0.11_148)]" },
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
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  );
  const [tags, setTags] = useState(task.tags.join(", "));
  const [note, setNote] = useState(task.note ?? "");
  const [pendingIds, setPendingIds] = useState<string[]>(
    task.assignee ? [task.assignee.id] : []
  );

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: projectMembers = [] } = useQuery(
    trpc.projects.members.queryOptions({ projectId: task.projectId, workspaceId })
  );


  const updateTask = useMutation(trpc.tasks.update.mutationOptions());
  const addAssignee = useMutation(trpc.tasks.addAssignee.mutationOptions());
  const removeAssignee = useMutation(trpc.tasks.removeAssignee.mutationOptions());

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);

    // Update task fields
    const updated = await updateTask.mutateAsync({
      id: task.id,
      data: {
        title: title.trim(), status, priority, tags: parsedTags,
        note: note.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      },
    });

    // Sync assignees: add new, remove old
    const originalId = task.assignee?.id;
    const toAdd = pendingIds.filter(id => id !== originalId);
    const toRemove = originalId && !pendingIds.includes(originalId) ? [originalId] : [];

    await Promise.all([
      ...toAdd.map(id => addAssignee.mutateAsync({ taskId: task.id, userId: id })),
      ...toRemove.map(id => removeAssignee.mutateAsync({ taskId: task.id, userId: id })),
    ]);

    const firstAssignee = pendingIds[0]
      ? projectMembers.find(m => m.user.id === pendingIds[0])?.user ?? null
      : null;

    onUpdated({
      ...task,
      title: updated.title,
      status: updated.status as BoardTask["status"],
      priority: updated.priority as BoardTask["priority"],
      tags: updated.tags,
      note: updated.note ?? null,
      dueDate: updated.dueDate ? new Date(updated.dueDate) : null,
      assignee: firstAssignee ? { id: firstAssignee.id, name: firstAssignee.name, image: firstAssignee.image } : null,
    });

    queryClient.invalidateQueries({ queryKey: trpc.projects.listMine.queryKey() });
  }

  const isPending = updateTask.isPending || addAssignee.isPending || removeAssignee.isPending;

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
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Task name</label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={500}
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all" />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTS.map((s) => (
                <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                  className={cn("py-2 text-xs font-semibold rounded-[8px] border transition-all",
                    status === s.value ? `${s.active} ${s.color}` : `${s.bg} ${s.color} opacity-60 hover:opacity-100`)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Note <span className="font-normal text-muted">(optional)</span></label>
            <MentionTextarea
              value={note}
              onChange={setNote}
              members={projectMembers.map(m => ({ id: m.user.id, name: m.user.name, image: m.user.image }))}
              placeholder="Write a note... type @ to mention someone"
              maxLength={2000}
              rows={3}
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_OPTS.map((p) => (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                  className={cn("flex-1 py-2 text-xs font-semibold rounded-[8px] border transition-all",
                    priority === p.value ? `${p.active} ${p.color}` : `${p.bg} ${p.color} opacity-60 hover:opacity-100`)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">
              Assignee{!canAssign && <span className="font-normal text-muted ml-1">(view only)</span>}
            </label>
            <AssigneeDropdown
              members={projectMembers.map(m => ({ id: m.user.id, name: m.user.name, image: m.user.image, tag: m.tag }))}
              selectedIds={pendingIds}
              onToggle={(id) => {
                if (!canAssign) return;
                setPendingIds(prev =>
                  prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                );
              }}
              disabled={!canAssign}
            />
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Due date</label>
            <DatePicker value={dueDate} onChange={setDueDate} placeholder="No due date" />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Tags <span className="font-normal text-muted">(comma-separated)</span></label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. frontend, bug, urgent"
              className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-9 border border-border rounded-[8px] text-sm font-medium text-foreground-2 hover:bg-surface-2 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim() || isPending}
              className="flex-1 h-9 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
