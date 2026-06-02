"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Loader2, Layers, ChevronRight, Plus, X,
  CheckCircle2, Clock, AlertCircle, TrendingUp,
} from "lucide-react";
import Link from "next/link";

type SprintStatus = "PLANNING" | "ACTIVE" | "COMPLETED";

const STATUS_META: Record<SprintStatus, { label: string; dot: string; badge: string }> = {
  ACTIVE:    { label: "Active",    dot: "bg-[oklch(52%_0.2_148)]",   badge: "bg-[oklch(93%_0.05_148)] text-[oklch(30%_0.17_148)]" },
  PLANNING:  { label: "Planning",  dot: "bg-[oklch(65%_0.08_258)]",  badge: "bg-[oklch(94%_0.03_258)] text-[oklch(40%_0.08_258)]" },
  COMPLETED: { label: "Completed", dot: "bg-[oklch(52%_0.22_228)]",  badge: "bg-[oklch(91%_0.06_228)] text-[oklch(35%_0.18_228)]" },
};

const STATUS_ORDER: SprintStatus[] = ["ACTIVE", "PLANNING", "COMPLETED"];

const TASK_STATUS_COLOR: Record<string, string> = {
  DONE:        "bg-[oklch(52%_0.2_148)]",
  IN_PROGRESS: "bg-[oklch(52%_0.22_228)]",
  REVIEW:      "bg-[oklch(72%_0.18_85)]",
  BACKLOG:     "bg-[oklch(78%_0.04_258)]",
};

function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function TaskBlocks({ tasks }: { tasks: { status: string }[] }) {
  const MAX_VISIBLE = 32;
  const sorted = [...tasks].sort((a, b) => {
    const order = ["DONE", "IN_PROGRESS", "REVIEW", "BACKLOG"];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });
  const visible = sorted.slice(0, MAX_VISIBLE);
  const overflow = sorted.length - MAX_VISIBLE;

  if (tasks.length === 0) return <p className="text-[11px] text-muted italic">No tasks</p>;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((t, i) => (
        <div key={i} title={t.status.replace("_", " ")}
          className={cn("w-3 h-3 rounded-[2px] flex-shrink-0", TASK_STATUS_COLOR[t.status] ?? "bg-surface-3")}
        />
      ))}
      {overflow > 0 && (
        <div className="w-3 h-3 rounded-[2px] bg-surface-3 flex items-center justify-center flex-shrink-0">
          <span className="text-[6px] font-bold text-muted">+{overflow}</span>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, iconColor, iconBg }: {
  icon: React.ReactNode; label: string; value: number | string; sub: string;
  iconColor: string; iconBg: string;
}) {
  return (
    <div className="p-4 rounded-[12px] border border-border bg-card">
      <div className={cn("w-8 h-8 rounded-[8px] flex items-center justify-center mb-3", iconBg, iconColor)}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-[12px] font-semibold text-foreground-2 mt-0.5">{label}</p>
      <p className="text-[11px] text-muted mt-0.5">{sub}</p>
    </div>
  );
}


function CreateSprintModal({
  projects, onClose, onCreated,
}: {
  projects: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const trpc = useTRPC();
  const today = new Date().toISOString().split("T")[0];
  const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(twoWeeks);
  const create = useMutation(trpc.sprint.create.mutationOptions());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !projectId) return;
    await create.mutateAsync({
      projectId,
      sprint: { name: name.trim(), startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString() },
    });
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-foreground">New Sprint</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted uppercase tracking-wide">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-surface-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30">
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-muted uppercase tracking-wide">Sprint Name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sprint 1"
              className="h-9 px-3 rounded-lg border border-border bg-surface-2 text-[13px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted uppercase tracking-wide">Start</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-surface-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-muted uppercase tracking-wide">End</label>
              <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)}
                className="h-9 px-3 rounded-lg border border-border bg-surface-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium text-muted hover:text-foreground hover:bg-surface-2 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || !projectId || create.isPending}
              className="h-9 px-4 rounded-lg bg-brand text-brand-foreground text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
              {create.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Sprint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AllSprintsView({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SprintStatus>("ACTIVE");
  const [showCreate, setShowCreate] = useState(false);

  const { data: sprints = [], isLoading } = useQuery({
    ...trpc.sprint.listAll.queryOptions({ workspaceId }),
    refetchInterval: 30_000,
  });

  const { data: allProjects = [] } = useQuery(trpc.projects.listMine.queryOptions());
  const projects = useMemo(() => allProjects.map((p) => ({ id: p.id, name: p.name })), [allProjects]);

  const kpi = useMemo(() => {
    const today = new Date();
    const active = sprints.filter((s) => s.status === "ACTIVE");
    const totalTasks = sprints.reduce((acc, s) => acc + s._count.tasks, 0);
    const doneTasks = sprints.reduce((acc, s) => acc + s.tasks.filter((t) => t.status === "DONE").length, 0);
    const completionRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
    const overdue = active.filter((s) => new Date(s.endDate) < today).length;
    return {
      active: active.length,
      planning: sprints.filter((s) => s.status === "PLANNING").length,
      completed: sprints.filter((s) => s.status === "COMPLETED").length,
      totalTasks,
      completionRate,
      overdue,
    };
  }, [sprints]);

const tabSprints = sprints.filter((s) => s.status === activeTab);

  function handleCreated() {
    queryClient.invalidateQueries({ queryKey: trpc.sprint.listAll.queryKey({ workspaceId }) });
    setShowCreate(false);
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1280px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Sprint Overview
          </p>
          <h1 className="text-[22px] font-bold text-foreground leading-none">All Sprints</h1>
          <p className="text-sm text-muted mt-1.5">
            <span className="font-medium text-foreground-2">{sprints.length}</span> sprints
            {" · "}
            <span className="font-medium text-foreground-2">{kpi.active}</span> active
            {" · "}
            <span className="font-medium text-foreground-2">{projects.length}</span> projects
          </p>
        </div>
        {projects.length > 0 && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-all shadow-sm shadow-brand/20"
          >
            <Plus className="w-4 h-4" />
            New Sprint
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<Layers className="w-4 h-4" />}
          label="Active Sprints"
          value={kpi.active}
          sub={`${kpi.planning} in planning`}
          iconColor="text-brand"
          iconBg="bg-brand-subtle"
        />
        <KpiCard
          icon={<Clock className="w-4 h-4" />}
          label="Total Tasks"
          value={kpi.totalTasks}
          sub="across all sprints"
          iconColor="text-[oklch(42%_0.18_228)]"
          iconBg="bg-[oklch(92%_0.05_228)]"
        />
        <KpiCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Completion Rate"
          value={`${kpi.completionRate}%`}
          sub={`${kpi.completed} sprint${kpi.completed !== 1 ? "s" : ""} completed`}
          iconColor="text-[oklch(40%_0.17_148)]"
          iconBg="bg-[oklch(92%_0.05_148)]"
        />
        <KpiCard
          icon={<AlertCircle className="w-4 h-4" />}
          label="Overdue"
          value={kpi.overdue}
          sub="active past end date"
          iconColor={kpi.overdue > 0 ? "text-error" : "text-[oklch(40%_0.17_148)]"}
          iconBg={kpi.overdue > 0 ? "bg-[oklch(93%_0.04_27)]" : "bg-[oklch(92%_0.05_148)]"}
        />
      </div>

      {/* Main grid */}
      <div>
        <div>
          <div className="bg-card rounded-[12px] border border-border shadow-[0_1px_4px_oklch(0%_0_0/4%)]">
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-border">
              {STATUS_ORDER.map((status) => {
                const count = sprints.filter((s) => s.status === status).length;
                const meta = STATUS_META[status];
                return (
                  <button
                    key={status}
                    onClick={() => setActiveTab(status)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors",
                      activeTab === status
                        ? "border-brand text-brand"
                        : "border-transparent text-muted hover:text-foreground"
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                    <span className={cn(
                      "text-[11px] px-1.5 py-0.5 rounded-full font-semibold",
                      activeTab === status ? "bg-brand-subtle text-brand" : "bg-surface-3 text-muted"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sprint list */}
            <div className="p-4">
              {tabSprints.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[13px] font-medium text-foreground mb-1">No {STATUS_META[activeTab].label.toLowerCase()} sprints</p>
                  {activeTab === "ACTIVE" && (
                    <p className="text-[12px] text-muted">Activate a planning sprint to get started</p>
                  )}
                  {activeTab === "PLANNING" && projects.length > 0 && (
                    <button onClick={() => setShowCreate(true)}
                      className="mt-3 flex items-center gap-1.5 px-3 h-8 rounded-lg bg-brand text-brand-foreground text-[13px] font-medium hover:opacity-90 transition-opacity mx-auto">
                      <Plus className="w-3.5 h-3.5" /> New Sprint
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {tabSprints.map((sprint) => {
                    const done = sprint.tasks.filter((t) => t.status === "DONE").length;
                    const total = sprint._count.tasks;
                    const isOverdue = sprint.status === "ACTIVE" && new Date(sprint.endDate) < new Date();
                    const daysLeft = Math.ceil((new Date(sprint.endDate).getTime() - Date.now()) / 86400000);
                    return (
                      <Link key={sprint.id} href={`/projects/${sprint.projectId}/sprints?sprintId=${sprint.id}`}
                        className="flex flex-col gap-3 p-4 rounded-[10px] border border-border hover:border-brand/40 hover:bg-surface-2/50 transition-all group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-semibold text-foreground truncate group-hover:text-brand transition-colors">
                                {sprint.name}
                              </p>
                              {isOverdue && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[oklch(93%_0.04_27)] text-[oklch(38%_0.18_27)] flex-shrink-0">
                                  Overdue
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-muted mt-0.5">{sprint.projectName}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 text-right">
                            <div>
                              <p className="text-[12px] text-muted">{fmt(sprint.startDate)} → {fmt(sprint.endDate)}</p>
                              {sprint.status === "ACTIVE" && (
                                <p className={cn("text-[11px] font-medium mt-0.5", isOverdue ? "text-[oklch(42%_0.21_27)]" : "text-muted")}>
                                  {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <TaskBlocks tasks={sprint.tasks} />
                        <div className="flex items-center justify-between text-[11px] text-muted">
                          <div className="flex items-center gap-3">
                            {(["DONE", "IN_PROGRESS", "REVIEW", "BACKLOG"] as const).map((s) => {
                              const count = sprint.tasks.filter((t) => t.status === s).length;
                              if (count === 0) return null;
                              return (
                                <span key={s} className="flex items-center gap-1">
                                  <span className={cn("w-2 h-2 rounded-[2px]", TASK_STATUS_COLOR[s])} />
                                  {count} {s === "IN_PROGRESS" ? "in progress" : s.toLowerCase().replace("_", " ")}
                                </span>
                              );
                            })}
                          </div>
                          <span>{done}/{total} done</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {showCreate && (
        <CreateSprintModal
          projects={projects}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
