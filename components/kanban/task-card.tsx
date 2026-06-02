"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, UserCircle2, Trash2, Pencil, X, SendHorizonal, CheckCircle2, XCircle, StickyNote } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import type { BoardTask } from "./kanban-board";
import { TaskEditModal } from "./task-edit-modal";
import { RejectModal } from "./reject-modal";
import { PixelPriorityIcon } from "@/components/shared/pixel-icons";

const PRIORITY_BAR: Record<string, string> = {
  LOW: "bg-priority-low",
  MEDIUM: "bg-priority-medium",
  HIGH: "bg-priority-high",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-[oklch(95%_0.05_148)] text-[oklch(42%_0.17_148)] border-[oklch(88%_0.08_148)]",
  MEDIUM: "bg-[oklch(96%_0.05_55)] text-[oklch(42%_0.18_55)] border-[oklch(88%_0.08_55)]",
  HIGH: "bg-[oklch(96%_0.05_27)] text-[oklch(42%_0.21_27)] border-[oklch(88%_0.08_27)]",
};

const PRIORITY_LABELS: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

type Props = {
  task: BoardTask;
  workspaceId?: string;
  canAssign?: boolean;
  permission?: "VIEWER" | "EDITOR" | "MANAGER";
  currentUserId?: string;
  onTaskUpdated?: (task: BoardTask) => void;
  onTaskDeleted?: (taskId: string) => void;
};

export function TaskCard({ task, workspaceId = "", canAssign = false, permission = "EDITOR", currentUserId = "", onTaskUpdated, onTaskDeleted }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [notePos, setNotePos] = useState<{ top: number; left: number; side: "right" | "left" } | null>(null);
  const noteButtonRef = useRef<HTMLButtonElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const trpc = useTRPC();
  const deleteTask = useMutation(trpc.tasks.delete.mutationOptions({
    onSuccess: () => onTaskDeleted?.(task.id),
  }));
  const submitTask = useMutation(trpc.tasks.submit.mutationOptions({
    onSuccess: () => onTaskUpdated?.({ ...task, status: "REVIEW" }),
  }));
  const approveTask = useMutation(trpc.tasks.approve.mutationOptions({
    onSuccess: () => onTaskUpdated?.({ ...task, status: "DONE" }),
  }));

  const isMyTask = task.assignee?.id === currentUserId;
  const canSubmit = permission === "EDITOR" && task.status === "IN_PROGRESS" && isMyTask;
  const canReview = permission === "MANAGER" && task.status === "REVIEW";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <>
      {/* Dim backdrop — rendered behind popover but above other cards */}
      {noteOpen && (
        <div
          className="fixed inset-0 z-[39] bg-black/20 backdrop-blur-[1px]"
          onClick={() => setNoteOpen(false)}
        />
      )}

      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group relative bg-card border border-border rounded-[12px] overflow-hidden cursor-pointer",
          "hover:shadow-[0_4px_16px_-4px_oklch(0%_0_0/12%)] hover:border-[oklch(85%_0.01_258)] transition-all duration-200",
          isDragging && "shadow-2xl rotate-1.5",
          noteOpen && "z-[41]"
        )}
        onClick={() => setEditing(true)}
      >
        {/* Priority accent bar */}
        <div className={cn("absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full", PRIORITY_BAR[task.priority])} />

        <div className="pl-4 pr-3 pt-3 pb-3">
          {/* Top row */}
          <div className="flex items-center justify-between mb-2.5 gap-2">
            <div className={cn("flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border", PRIORITY_BADGE[task.priority])}>
              <PixelPriorityIcon priority={task.priority} />
              {PRIORITY_LABELS[task.priority]}
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {confirmDelete ? (
                /* Confirm state */
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTask.mutate({ id: task.id }); }}
                    disabled={deleteTask.isPending}
                    className="h-6 px-2 rounded-md text-[10px] font-bold bg-error text-white transition-colors"
                  >
                    Delete?
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:bg-surface-3 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <>
                  {/* Edit */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-brand hover:bg-brand-subtle transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-error hover:bg-[oklch(96%_0.03_27)] transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  {/* Drag handle */}
                  <button
                    {...attributes}
                    {...listeners}
                    onClick={(e) => e.stopPropagation()}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted cursor-grab active:cursor-grabbing hover:bg-surface-3 transition-colors"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="text-[13px] font-medium text-foreground leading-snug mb-2.5 pr-1">{task.title}</p>

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {task.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[10px] bg-surface-2 text-muted px-1.5 py-0.5 rounded-md border border-border font-medium">{tag}</span>
              ))}
              {task.tags.length > 2 && <span className="text-[10px] text-muted-2 font-medium">+{task.tags.length - 2}</span>}
            </div>
          )}

          {task.note && (
            <button
              ref={noteButtonRef}
              data-note-popover
              onClick={(e) => {
                e.stopPropagation();
                const rect = noteButtonRef.current?.getBoundingClientRect();
                if (rect) {
                  const spaceRight = window.innerWidth - rect.right;
                  const side = spaceRight >= 280 ? "right" : "left";
                  setNotePos({ top: rect.top, left: side === "right" ? rect.right + 10 : rect.left - 10, side });
                }
                setNoteOpen(v => !v);
              }}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 mb-2 rounded-lg border border-[oklch(88%_0.09_75)] bg-[oklch(97%_0.03_80)] hover:bg-[oklch(94%_0.05_80)] transition-colors text-left"
            >
              <StickyNote className="w-3 h-3 text-[oklch(55%_0.14_75)] flex-shrink-0" />
              <span className="text-[10px] font-semibold text-[oklch(48%_0.14_75)]">This task has a note · click to view</span>
            </button>
          )}

          <div className="flex items-center justify-between gap-2">
            {task.assignee ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5 h-5 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {task.assignee.image
                    ? <img src={task.assignee.image} alt={task.assignee.name} className="w-full h-full object-cover" />
                    : <span className="text-[9px] font-bold text-brand">{task.assignee.name.slice(0, 2).toUpperCase()}</span>}
                </div>
                <span className="text-[11px] text-muted truncate">{task.assignee.name}</span>
                {task.assignee.tag && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-brand-subtle text-brand border border-brand-muted flex-shrink-0">
                    {task.assignee.tag}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <UserCircle2 className="w-3.5 h-3.5 text-muted-2" />
                <span className="text-[11px] text-muted-2">Unassigned</span>
              </div>
            )}
            {task.dueDate && (
              <div className={cn("flex items-center gap-1 text-[11px] flex-shrink-0", isOverdue ? "text-error font-semibold" : "text-muted")}>
                <CalendarDays className="w-3 h-3 flex-shrink-0" />
                {formatDate(task.dueDate)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow buttons */}
      {canSubmit && (
        <div className="px-4 pb-3 pt-0">
          <button
            onClick={(e) => { e.stopPropagation(); submitTask.mutate({ id: task.id }); }}
            disabled={submitTask.isPending}
            className="w-full h-7 flex items-center justify-center gap-1.5 text-[11px] font-semibold rounded-lg bg-[oklch(93%_0.05_228)] text-[oklch(38%_0.18_228)] hover:bg-[oklch(88%_0.08_228)] transition-colors"
          >
            <SendHorizonal className="w-3 h-3" />
            Submit for Review
          </button>
        </div>
      )}
      {canReview && (
        <div className="px-4 pb-3 pt-0 flex gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); approveTask.mutate({ id: task.id }); }}
            disabled={approveTask.isPending}
            className="flex-1 h-7 flex items-center justify-center gap-1 text-[11px] font-semibold rounded-lg bg-[oklch(93%_0.05_148)] text-[oklch(38%_0.17_148)] hover:bg-[oklch(88%_0.08_148)] transition-colors"
          >
            <CheckCircle2 className="w-3 h-3" />
            Approve
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setRejectOpen(true); }}
            className="flex-1 h-7 flex items-center justify-center gap-1 text-[11px] font-semibold rounded-lg bg-[oklch(95%_0.04_27)] text-[oklch(42%_0.21_27)] hover:bg-[oklch(90%_0.07_27)] transition-colors"
          >
            <XCircle className="w-3 h-3" />
            Reject
          </button>
        </div>
      )}

      {rejectOpen && (
        <RejectModal
          taskId={task.id}
          taskTitle={task.title}
          onClose={() => setRejectOpen(false)}
          onRejected={() => { onTaskUpdated?.({ ...task, status: "BACKLOG" }); setRejectOpen(false); }}
        />
      )}

      {editing && (
        <TaskEditModal
          task={task}
          workspaceId={workspaceId}
          canAssign={canAssign}
          onClose={() => setEditing(false)}
          onUpdated={(updated) => { onTaskUpdated?.(updated); setEditing(false); }}
        />
      )}

      {noteOpen && task.note && notePos && (
        <NotePopover title={task.title} note={task.note} pos={notePos} onClose={() => setNoteOpen(false)} />
      )}
    </>
  );
}

function NotePopover({ title, note, pos, onClose }: {
  title: string; note: string;
  pos: { top: number; left: number; side: "right" | "left" };
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-note-popover]")) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const style: React.CSSProperties = pos.side === "right"
    ? { top: pos.top, left: pos.left }
    : { top: pos.top, right: window.innerWidth - pos.left };

  return (
    <div
      data-note-popover
      className="fixed z-50 w-80 bg-card border border-border rounded-2xl shadow-[0_8px_40px_-8px_oklch(0%_0_0/25%),0_2px_8px_-2px_oklch(0%_0_0/12%)] animate-in fade-in slide-in-from-bottom-3 duration-200"
      style={style}
    >
      {/* Arrow */}
      <div
        className="absolute w-3 h-3 rotate-45"
        style={pos.side === "right"
          ? { left: -7, top: 22, background: "var(--color-brand-subtle)", border: "1px solid var(--color-brand-muted)", borderTop: "none", borderRight: "none" }
          : { right: -7, top: 22, background: "var(--color-brand-subtle)", border: "1px solid var(--color-brand-muted)", borderBottom: "none", borderLeft: "none" }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl bg-brand-subtle border-b border-brand-muted">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-muted flex items-center justify-center">
            <StickyNote className="w-4 h-4 text-brand" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-brand uppercase tracking-wide leading-none">Note</p>
            <p className="text-[13px] font-semibold text-foreground leading-snug mt-0.5 truncate max-w-[190px]">{title}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-brand-muted flex items-center justify-center text-muted hover:text-brand transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Note content */}
      <div className="px-4 py-4">
        <div
          className="max-h-56 overflow-y-auto pr-3"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--color-brand-muted) transparent" }}
        >
          <div className="flex gap-3">
            <div className="w-[3px] rounded-full bg-brand flex-shrink-0 self-stretch" />
            <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{note}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
