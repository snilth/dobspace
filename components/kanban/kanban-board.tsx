"use client";

import { useState, useCallback, useRef } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, closestCorners, useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Eye } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { usePusherEvent } from "@/hooks/use-pusher";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";
import { CreateTaskDialog } from "./create-task-dialog";
import type {
  TaskMovedPayload,
  TaskCreatedPayload,
  TaskUpdatedPayload,
  TaskDeletedPayload,
} from "@/lib/socket/events";

export type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";

export type BoardTask = {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: "LOW" | "MEDIUM" | "HIGH";
  tags: string[];
  dueDate?: Date | null;
  sprintId?: string | null;
  assignee?: { id: string; name: string; image?: string | null; tag?: string | null } | null;
};

const COLUMNS: {
  id: TaskStatus; label: string; dot: string; bg: string;
  headerText: string; countBg: string;
}[] = [
  { id: "BACKLOG", label: "Backlog", dot: "oklch(60% 0.009 258)", bg: "bg-[oklch(97%_0.003_258)]", headerText: "text-[oklch(48%_0.008_258)]", countBg: "bg-[oklch(92%_0.004_258)] text-[oklch(50%_0.008_258)]" },
  { id: "IN_PROGRESS", label: "In Progress", dot: "oklch(57% 0.21 228)", bg: "bg-[oklch(97%_0.02_228)]", headerText: "text-[oklch(40%_0.18_228)]", countBg: "bg-[oklch(91%_0.04_228)] text-[oklch(42%_0.18_228)]" },
  { id: "REVIEW", label: "In Review", dot: "oklch(61% 0.21 55)", bg: "bg-[oklch(97%_0.02_55)]", headerText: "text-[oklch(42%_0.17_55)]", countBg: "bg-[oklch(93%_0.04_55)] text-[oklch(44%_0.17_55)]" },
  { id: "DONE", label: "Done", dot: "oklch(57% 0.2 148)", bg: "bg-[oklch(97%_0.02_148)]", headerText: "text-[oklch(38%_0.17_148)]", countBg: "bg-[oklch(91%_0.05_148)] text-[oklch(40%_0.17_148)]" },
];

function KanbanColumn({ column, tasks, projectId, workspaceId, canAssign, permission, currentUserId, onTaskCreated, onTaskUpdated, onTaskDeleted }: {
  column: (typeof COLUMNS)[number];
  tasks: BoardTask[];
  projectId: string;
  workspaceId: string;
  canAssign: boolean;
  permission: "VIEWER" | "EDITOR" | "MANAGER";
  currentUserId: string;
  onTaskCreated: (task: BoardTask) => void;
  onTaskUpdated: (task: BoardTask) => void;
  onTaskDeleted: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex flex-col flex-1 min-w-[220px]">
      <div className={cn(
        "flex items-center justify-between px-3 py-2.5 rounded-xl mb-2.5 border border-transparent",
        column.bg, isOver && "border-dashed border-border-strong"
      )}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: column.dot }} />
          <span className={cn("text-[13px] font-semibold", column.headerText)}>{column.label}</span>
          <span className={cn("text-[11px] px-1.5 py-0.5 rounded-md font-semibold", column.countBg)}>{tasks.length}</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:bg-black/8", column.headerText)}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div ref={setNodeRef} className={cn("flex-1 space-y-2 min-h-20 rounded-xl p-1.5 transition-colors", isOver && "bg-brand-subtle ring-2 ring-brand/20 ring-dashed")}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              workspaceId={workspaceId}
              canAssign={canAssign}
              permission={permission}
              currentUserId={currentUserId}
              onTaskUpdated={onTaskUpdated}
              onTaskDeleted={onTaskDeleted}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && !isOver && (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-border text-xs text-muted hover:border-brand/30 hover:text-brand hover:bg-brand-subtle transition-all"
          >
            + Add task
          </button>
        )}
      </div>

      {showCreate && (
        <CreateTaskDialog
          projectId={projectId}
          defaultStatus={column.id}
          onClose={() => setShowCreate(false)}
          onTaskCreated={(task) => { onTaskCreated(task); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

export function KanbanBoard({ initialTasks, projectId, workspaceId = "", currentUserId, permission = "EDITOR" }: {
  initialTasks: BoardTask[]; projectId: string; workspaceId?: string; currentUserId: string;
  permission?: "VIEWER" | "EDITOR" | "MANAGER";
}) {
  const [tasks, setTasks] = useState<BoardTask[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [showViewerToast, setShowViewerToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isViewer = permission === "VIEWER";

  function blockViewer() {
    if (!isViewer) return false;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setShowViewerToast(true);
    toastTimer.current = setTimeout(() => setShowViewerToast(false), 2500);
    return true;
  }

  const trpc = useTRPC();
  const moveTask = useMutation(trpc.tasks.move.mutationOptions());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const channel = `project-${projectId}`;

  usePusherEvent(channel, "task:moved", useCallback((payload: TaskMovedPayload) => {
    if (payload.changedBy === currentUserId) return;
    setTasks((prev) => prev.map((t) => t.id === payload.taskId ? { ...t, status: payload.status } : t));
  }, [currentUserId]));

  usePusherEvent(channel, "task:created", useCallback((payload: TaskCreatedPayload) => {
    if (payload.changedBy === currentUserId) return;
    setTasks((prev) => [...prev, {
      id: payload.taskId,
      projectId,
      title: payload.title,
      status: payload.status,
      priority: payload.priority,
      tags: payload.tags,
      assignee: payload.assignee,
      dueDate: payload.dueDate,
    }]);
  }, [currentUserId, projectId]));

  usePusherEvent(channel, "task:updated", useCallback((payload: TaskUpdatedPayload) => {
    if (payload.changedBy === currentUserId) return;
    setTasks((prev) => prev.map((t) => t.id === payload.taskId ? {
      ...t,
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.priority !== undefined && { priority: payload.priority }),
      ...(payload.status !== undefined && { status: payload.status }),
      ...(payload.tags !== undefined && { tags: payload.tags }),
      ...(payload.dueDate !== undefined && { dueDate: payload.dueDate }),
      ...(payload.assignee !== undefined && { assignee: payload.assignee }),
    } : t));
  }, [currentUserId]));

  usePusherEvent(channel, "task:deleted", useCallback((payload: TaskDeletedPayload) => {
    if (payload.changedBy === currentUserId) return;
    setTasks((prev) => prev.filter((t) => t.id !== payload.taskId));
  }, [currentUserId]));

  const handleTaskCreated = useCallback((task: BoardTask) => {
    setTasks((prev) => [...prev, task]);
    // Server already emits task:created to others
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (blockViewer()) return;
    setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null);
  }, [tasks, isViewer]);

  const EDITOR_ALLOWED: TaskStatus[] = ["BACKLOG", "IN_PROGRESS"];

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const isColumn = COLUMNS.some((c) => c.id === overId);
    const newStatus = isColumn
      ? (overId as TaskStatus)
      : (tasks.find((t) => t.id === overId)?.status ?? null);

    if (!newStatus) return;
    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;

    // EDITOR: can only drag within BACKLOG ↔ IN_PROGRESS
    if (permission === "EDITOR") {
      if (!EDITOR_ALLOWED.includes(newStatus) || !EDITOR_ALLOWED.includes(currentTask.status)) return;
    }

    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    moveTask.mutate(
      { id: taskId, status: newStatus },
      { onError: () => setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: currentTask.status } : t)) }
    );
  }, [tasks, moveTask, permission]);

  return (
    <DndContext id="kanban-dnd" sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Viewer overlay — locks entire board */}
      <div className="relative">
        <div className="flex gap-4 px-6 pb-8 overflow-x-auto min-h-0 min-w-0">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks.filter((t) => t.status === column.id)}
              projectId={projectId}
              workspaceId={workspaceId}
              canAssign={permission === "MANAGER"}
              permission={permission}
              currentUserId={currentUserId}
              onTaskCreated={handleTaskCreated}
              onTaskUpdated={(updated) => setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))}
              onTaskDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
            />
          ))}
        </div>
        {isViewer && (
          <div
            className="absolute inset-0 z-10 select-none"
            style={{ cursor: "not-allowed" }}
            onClick={blockViewer}
          />
        )}
      </div>


      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 scale-105 shadow-2xl shadow-black/20">
            <TaskCard task={activeTask} />
          </div>
        )}
      </DragOverlay>
      {/* Viewer toast */}
      {showViewerToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-foreground text-[oklch(95%_0.005_258)] rounded-xl shadow-lg text-[13px] font-medium pointer-events-none">
          <Eye className="w-4 h-4 flex-shrink-0" />
          You have view-only access
        </div>
      )}
    </DndContext>
  );
}
