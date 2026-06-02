"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Play, CheckCircle2, Trash2, Sparkles, Loader2, X, Check,
  ChevronDown, ChevronUp, Plus, Minus, Pencil, AlertTriangle, Users,
} from "lucide-react";
import { SprintCompleteModal } from "./sprint-complete-modal";

type SprintStatus = "PLANNING" | "ACTIVE" | "COMPLETED";

const STATUS_META: Record<SprintStatus, { label: string; badge: string }> = {
  PLANNING:  { label: "Planning",  badge: "bg-[oklch(94%_0.03_258)] text-[oklch(40%_0.08_258)]" },
  ACTIVE:    { label: "Active",    badge: "bg-[oklch(93%_0.05_148)] text-[oklch(38%_0.17_148)]" },
  COMPLETED: { label: "Completed", badge: "bg-[oklch(91%_0.06_228)] text-[oklch(35%_0.18_228)]" },
};

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: "Backlog", IN_PROGRESS: "In Progress", REVIEW: "Review", DONE: "Done",
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "text-[oklch(42%_0.21_27)]", MEDIUM: "text-[oklch(42%_0.18_55)]", LOW: "text-[oklch(42%_0.17_148)]",
};

function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type SprintSummary = {
  id: string;
  name: string;
  status: string;
  projectId: string;
  startDate: Date | string;
  endDate: Date | string;
  summary: string | null;
  summaryAt: Date | string | null;
  _count: { tasks: number };
  tasks: { status: string }[];
};

type SprintFull = {
  id: string;
  name: string;
  status: string;
  startDate: Date | string;
  endDate: Date | string;
  summary: string | null;
  summaryAt: Date | string | null;
  projectId: string;
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: Date | string | null;
    assignees: { user: { id: string; name: string; image: string | null } }[];
  }[];
};

type Props = {
  sprint: SprintSummary;
  projectId: string;
  workspaceId: string;
  canManage: boolean;
  onActivate: () => void;
  onComplete: () => void;
  isActivating: boolean;
  isCompleting: boolean;
  onDeleted: () => void;
  onUpdated: () => void;
};

export function SprintDetail({
  sprint, projectId, workspaceId, canManage,
  onActivate, onComplete, isActivating, isCompleting,
  onDeleted, onUpdated,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showBacklog, setShowBacklog] = useState(true);
  const [showCapacity, setShowCapacity] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState(sprint.name);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const { data: detail } = useQuery({
    ...trpc.sprint.get.queryOptions({ sprintId: sprint.id }),
  }) as { data: SprintFull | undefined };

  const { data: projectData } = useQuery(
    trpc.projects.get.queryOptions({ id: projectId })
  );
  const allProjectTasks = (projectData?.tasks ?? []) as { id: string; title: string; status: string; priority: string; dueDate?: Date | string | null; sprintId?: string | null }[];

  const deleteSprint = useMutation({
    ...trpc.sprint.delete.mutationOptions(),
    onSuccess: onDeleted,
  });

  const updateSprint = useMutation({
    ...trpc.sprint.update.mutationOptions(),
    onSuccess: () => { onUpdated(); setEditName(false); },
  });

  const generateSummary = useMutation({
    ...trpc.sprint.generateSummary.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.sprint.get.queryKey({ sprintId: sprint.id }) });
      onUpdated();
    },
  });

  const assignTasks = useMutation({
    ...trpc.sprint.assignTasks.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.sprint.get.queryKey({ sprintId: sprint.id }) });
      queryClient.invalidateQueries({ queryKey: trpc.projects.get.queryKey({ id: projectId }) });
      onUpdated();
    },
  });

  const removeTasks = useMutation({
    ...trpc.sprint.removeTasks.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.sprint.get.queryKey({ sprintId: sprint.id }) });
      queryClient.invalidateQueries({ queryKey: trpc.projects.get.queryKey({ id: projectId }) });
      onUpdated();
    },
  });

  const meta = STATUS_META[sprint.status as SprintStatus];
  const sprintTaskIds = new Set(detail?.tasks.map((t) => t.id) ?? []);
  const backlogTasks = allProjectTasks.filter((t) => !sprintTaskIds.has(t.id));

  const done = sprint.tasks.filter((t) => t.status === "DONE").length;
  const total = sprint._count.tasks;

  return (
    <>
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex-1 min-w-0">
          {editName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (nameVal.trim()) updateSprint.mutate({ sprintId: sprint.id, name: nameVal.trim() });
              }}
              className="flex items-center gap-2"
            >
              <input
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                className="text-[17px] font-semibold bg-surface-2 border border-border rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-brand/30 min-w-0 flex-1"
              />
              <button type="submit" disabled={updateSprint.isPending} className="w-7 h-7 rounded-lg bg-brand text-brand-foreground flex items-center justify-center hover:opacity-90">
                {updateSprint.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button type="button" onClick={() => { setEditName(false); setNameVal(sprint.name); }} className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted">
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-[17px] font-semibold text-foreground truncate">{sprint.name}</h2>
              {canManage && sprint.status !== "COMPLETED" && (
                <button onClick={() => setEditName(true)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md hover:bg-surface-3 flex items-center justify-center text-muted transition-opacity">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", meta.badge)}>{meta.label}</span>
            <span className="text-[12px] text-muted">{fmt(sprint.startDate)} – {fmt(sprint.endDate)}</span>
            <span className="text-[12px] text-muted">{done}/{total} tasks done</span>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {sprint.status === "PLANNING" && (
              <button
                onClick={onActivate}
                disabled={isActivating}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[oklch(93%_0.05_148)] text-[oklch(30%_0.17_148)] text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {isActivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Activate
              </button>
            )}
            {sprint.status === "ACTIVE" && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[oklch(91%_0.06_228)] text-[oklch(30%_0.18_228)] text-[13px] font-medium hover:opacity-80 transition-opacity"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete
              </button>
            )}
            {sprint.status === "COMPLETED" && (
              <button
                onClick={() => generateSummary.mutate({ sprintId: sprint.id })}
                disabled={generateSummary.isPending}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-[13px] font-medium text-muted hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50"
              >
                {generateSummary.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Regenerate Summary
              </button>
            )}
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-muted">Delete sprint?</span>
                <button onClick={() => deleteSprint.mutate({ sprintId: sprint.id })} className="h-7 px-2.5 rounded-lg bg-destructive text-destructive-foreground text-[12px] font-medium hover:opacity-80">
                  {deleteSprint.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="h-7 px-2.5 rounded-lg border border-border text-[12px] text-muted hover:text-foreground">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="w-8 h-8 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">

        {/* Health indicators */}
        {detail && sprint.status !== "COMPLETED" && (() => {
          const noAssignee = detail.tasks.filter((t) => t.status !== "DONE" && t.assignees.length === 0);
          const noDueDate = detail.tasks.filter((t) => t.status !== "DONE" && !("dueDate" in t && t.dueDate));
          if (noAssignee.length === 0 && noDueDate.length === 0) return null;
          return (
            <div className="rounded-xl border border-[oklch(85%_0.09_55)] bg-[oklch(97%_0.03_55)] p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 mb-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[oklch(52%_0.18_55)]" />
                <span className="text-[12px] font-semibold text-[oklch(38%_0.16_55)]">Sprint Health</span>
              </div>
              {noAssignee.length > 0 && (
                <p className="text-[12px] text-[oklch(42%_0.14_55)]">
                  <span className="font-semibold">{noAssignee.length} task{noAssignee.length !== 1 ? "s" : ""}</span> without assignee
                </p>
              )}
              {noDueDate.length > 0 && (
                <p className="text-[12px] text-[oklch(42%_0.14_55)]">
                  <span className="font-semibold">{noDueDate.length} task{noDueDate.length !== 1 ? "s" : ""}</span> without due date
                </p>
              )}
            </div>
          );
        })()}

        {/* Capacity view */}
        {detail && detail.tasks.length > 0 && (
          <div>
            <button
              onClick={() => setShowCapacity((v) => !v)}
              className="flex items-center gap-2 text-[13px] font-medium text-muted hover:text-foreground transition-colors mb-3"
            >
              <Users className="w-4 h-4" />
              Team Workload
              {showCapacity ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showCapacity && (() => {
              const memberMap = new Map<string, { name: string; image: string | null; tasks: typeof detail.tasks }>();
              for (const task of detail.tasks) {
                if (task.assignees.length === 0) {
                  const key = "__unassigned__";
                  if (!memberMap.has(key)) memberMap.set(key, { name: "Unassigned", image: null, tasks: [] });
                  memberMap.get(key)!.tasks.push(task);
                } else {
                  const u = task.assignees[0].user;
                  if (!memberMap.has(u.id)) memberMap.set(u.id, { name: u.name, image: u.image, tasks: [] });
                  memberMap.get(u.id)!.tasks.push(task);
                }
              }
              const members = [...memberMap.values()].sort((a, b) => b.tasks.length - a.tasks.length);
              const maxTasks = members[0]?.tasks.length ?? 1;
              return (
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                  {members.map((m) => {
                    const done = m.tasks.filter((t) => t.status === "DONE").length;
                    const pct = Math.round((m.tasks.length / maxTasks) * 100);
                    return (
                      <div key={m.name}>
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <div className="w-6 h-6 rounded-full bg-surface-3 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {m.image
                              ? <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                              : <span className="text-[9px] font-bold text-muted">{m.name[0]}</span>
                            }
                          </div>
                          <span className="text-[13px] font-medium text-foreground flex-1">{m.name}</span>
                          <span className="text-[12px] text-muted">{done}/{m.tasks.length} done</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* AI Summary */}
        {(sprint.summary || sprint.status === "COMPLETED") && (
          <div className="rounded-xl border border-border bg-surface-2/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-brand" />
              <span className="text-[12px] font-semibold text-muted uppercase tracking-wide">AI Summary</span>
              {sprint.summaryAt && (
                <span className="text-[11px] text-muted ml-auto">
                  {fmt(sprint.summaryAt)}
                </span>
              )}
            </div>
            {generateSummary.isPending ? (
              <div className="flex items-center gap-2 text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[13px]">Generating summary…</span>
              </div>
            ) : sprint.summary ? (
              <p className="text-[13px] text-foreground leading-relaxed">{sprint.summary}</p>
            ) : (
              <p className="text-[13px] text-muted italic">No summary yet. Complete the sprint to generate one.</p>
            )}
          </div>
        )}


        {/* Sprint tasks */}
        <div>
          <h3 className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-3">
            Sprint Tasks ({detail?.tasks.length ?? 0})
          </h3>
          {detail?.tasks.length === 0 ? (
            <p className="text-[13px] text-muted italic">No tasks yet. Add tasks below.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {detail?.tasks.map((task) => {
                const due = task.dueDate ? new Date(task.dueDate) : null;
                const isOverdue = due && due < new Date() && task.status !== "DONE";
                return (
                  <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-surface-2 transition-colors group">
                    <span className={cn("text-[11px] font-bold w-14 flex-shrink-0", PRIORITY_COLOR[task.priority])}>{task.priority}</span>
                    <span className="flex-1 text-[13px] text-foreground truncate">{task.title}</span>
                    {due && (
                      <span className={cn("text-[11px] flex-shrink-0", isOverdue ? "text-[oklch(42%_0.21_27)] font-semibold" : "text-muted")}>
                        {due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        {isOverdue && " ⚠"}
                      </span>
                    )}
                    <span className="text-[11px] text-muted flex-shrink-0">{STATUS_LABEL[task.status] ?? task.status}</span>
                    {task.assignees[0] ? (
                      <div className="w-5 h-5 rounded-full bg-surface-3 flex-shrink-0 overflow-hidden" title={task.assignees[0].user.name}>
                        {task.assignees[0].user.image
                          ? <img src={task.assignees[0].user.image} alt="" className="w-full h-full object-cover" />
                          : <span className="w-full h-full flex items-center justify-center text-[8px] font-bold text-muted">{task.assignees[0].user.name[0]}</span>
                        }
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-dashed border-border flex-shrink-0 flex items-center justify-center" title="No assignee">
                        <span className="text-[8px] text-muted">?</span>
                      </div>
                    )}
                    {canManage && sprint.status !== "COMPLETED" && (
                      <button
                        onClick={() => removeTasks.mutate({ sprintId: sprint.id, taskIds: [task.id] })}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md hover:bg-surface-3 flex items-center justify-center text-muted hover:text-destructive transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add tasks (not in sprint, not DONE) */}
        {canManage && sprint.status !== "COMPLETED" && (
          <div>
            <button
              onClick={() => setShowBacklog((v) => !v)}
              className="flex items-center gap-2 text-[12px] font-semibold text-muted uppercase tracking-wide hover:text-foreground transition-colors mb-3"
            >
              {showBacklog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Add Tasks ({backlogTasks.filter((t) => t.status !== "DONE").length})
            </button>
            {showBacklog && (() => {
              const addable = backlogTasks.filter((t) => t.status !== "DONE");
              return addable.length === 0 ? (
                <p className="text-[13px] text-muted italic">All tasks are in this sprint.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {addable.map((task) => {
                    const hasDue = !!task.dueDate;
                    return (
                      <div
                        key={task.id}
                        title={hasDue ? undefined : "Set a due date before adding to sprint"}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors group",
                          hasDue
                            ? "border-dashed border-border hover:border-brand/40 hover:bg-brand-subtle/30"
                            : "border-dashed border-border bg-surface-2/50 opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span className={cn("text-[11px] font-bold w-14 flex-shrink-0", PRIORITY_COLOR[task.priority])}>{task.priority}</span>
                        <span className="flex-1 text-[13px] text-foreground truncate">{task.title}</span>
                        {!hasDue && (
                          <span className="text-[10px] text-muted flex-shrink-0 italic">No due date</span>
                        )}
                        <span className="text-[11px] text-muted flex-shrink-0">{STATUS_LABEL[task.status] ?? task.status}</span>
                        <button
                          disabled={!hasDue}
                          onClick={() => hasDue && assignTasks.mutate({ sprintId: sprint.id, taskIds: [task.id] })}
                          className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                            hasDue
                              ? "opacity-0 group-hover:opacity-100 hover:bg-brand-subtle text-muted hover:text-brand"
                              : "hidden"
                          )}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>

    {showCompleteModal && detail && (
      <SprintCompleteModal
        sprintId={sprint.id}
        projectId={sprint.projectId}
        incompleteTasks={detail.tasks.filter((t) => t.status !== "DONE")}
        onClose={() => setShowCompleteModal(false)}
        onCompleted={() => {
          setShowCompleteModal(false);
          onComplete();
        }}
      />
    )}
    </>
  );
}
