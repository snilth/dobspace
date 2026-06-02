"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTRPC } from "@/lib/trpc/client";
import { usePusherEvent } from "@/hooks/use-pusher";
import { cn } from "@/lib/utils";
import { Plus, Play, CheckCircle2, Clock, Loader2, Sparkles, X, ChevronRight, Calendar } from "lucide-react";
import { SprintCreateModal } from "./sprint-create-modal";
import { SprintDetail } from "./sprint-detail";

type SprintStatus = "PLANNING" | "ACTIVE" | "COMPLETED";

const STATUS_META: Record<SprintStatus, { label: string; dot: string; badge: string }> = {
  PLANNING: { label: "Planning",  dot: "bg-[oklch(65%_0.08_258)]",  badge: "bg-[oklch(94%_0.03_258)] text-[oklch(40%_0.08_258)]" },
  ACTIVE:   { label: "Active",    dot: "bg-[oklch(52%_0.2_148)]",   badge: "bg-[oklch(93%_0.05_148)] text-[oklch(38%_0.17_148)]" },
  COMPLETED:{ label: "Completed", dot: "bg-[oklch(52%_0.22_228)]",  badge: "bg-[oklch(91%_0.06_228)] text-[oklch(35%_0.18_228)]" },
};

function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type Props = {
  projectId: string;
  workspaceId: string;
  canManage: boolean;
};

export function SprintView({ projectId, workspaceId, canManage }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("sprintId")
  );
  const [showCreate, setShowCreate] = useState(false);

  const { data: sprints = [], isLoading } = useQuery(
    trpc.sprint.list.queryOptions({ projectId })
  );

  usePusherEvent(`private-project-${projectId}`, "sprint:updated", ({ sprintId }) => {
    queryClient.invalidateQueries({ queryKey: trpc.sprint.list.queryKey({ projectId }) });
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: trpc.sprint.get.queryKey({ sprintId: selectedId }) });
    }
    if (sprintId !== selectedId) {
      queryClient.invalidateQueries({ queryKey: trpc.sprint.get.queryKey({ sprintId }) });
    }
  });

  const activate = useMutation({
    ...trpc.sprint.activate.mutationOptions(),
    onSuccess: () => invalidate(),
  });
  const complete = useMutation({
    ...trpc.sprint.complete.mutationOptions(),
    onSuccess: () => invalidate(),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: trpc.sprint.list.queryKey({ projectId }) });
    if (selectedId) {
      queryClient.invalidateQueries({ queryKey: trpc.sprint.get.queryKey({ sprintId: selectedId }) });
    }
  }

  const selected = sprints.find((s) => s.id === selectedId) ?? null;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Sprint list */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[13px] font-semibold text-foreground">Sprints</span>
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {sprints.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-muted" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">No sprints yet</p>
              <p className="text-[12px] text-muted mt-0.5">Create your first sprint to get started</p>
            </div>
            {canManage && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-brand text-brand-foreground text-[13px] font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" /> New Sprint
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-2">
            {sprints.map((sprint) => {
              const meta = STATUS_META[sprint.status as SprintStatus];
              const done = sprint.tasks.filter((t) => t.status === "DONE").length;
              const total = sprint._count.tasks;
              const isSelected = sprint.id === selectedId;
              return (
                <button
                  key={sprint.id}
                  onClick={() => setSelectedId(sprint.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-l-2",
                    isSelected
                      ? "bg-brand-subtle border-l-brand"
                      : "border-l-transparent hover:bg-surface-2"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1.5", meta.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[13px] font-medium truncate", isSelected ? "text-brand" : "text-foreground")}>
                      {sprint.name}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {fmt(sprint.startDate)} – {fmt(sprint.endDate)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", meta.badge)}>
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-muted">{done}/{total} done</span>
                    </div>
                  </div>
                  <ChevronRight className={cn("w-3.5 h-3.5 flex-shrink-0 mt-1", isSelected ? "text-brand" : "text-muted")} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Detail */}
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <SprintDetail
            sprint={selected}
            projectId={projectId}
            workspaceId={workspaceId}
            canManage={canManage}
            onActivate={() => activate.mutate({ sprintId: selected.id })}
            onComplete={() => complete.mutate({ sprintId: selected.id })}
            isActivating={activate.isPending}
            isCompleting={complete.isPending}
            onDeleted={() => { setSelectedId(null); invalidate(); }}
            onUpdated={invalidate}
          />
        ) : (
          <div className="flex-1 h-full flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-[14px] font-medium text-foreground">Select a sprint</p>
            <p className="text-[13px] text-muted">Choose a sprint from the list to view details</p>
          </div>
        )}
      </div>

      {showCreate && (
        <SprintCreateModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            invalidate();
            setSelectedId(id);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
