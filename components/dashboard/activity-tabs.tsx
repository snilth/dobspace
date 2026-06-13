"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectProgress = {
  id: string;
  name: string;
  total: number;
  done: number;
  inProgress: number;
};

type RecentActivity = {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectName: string;
  assigneeName: string | null;
  updatedAt: Date;
};

type Props = {
  projectProgress: ProjectProgress[];
  recentActivity: RecentActivity[];
};

const STATUS_DOT: Record<string, string> = {
  DONE: "bg-status-done",
  IN_PROGRESS: "bg-status-progress",
  REVIEW: "bg-status-review",
  BACKLOG: "bg-status-backlog",
};

const PRIORITY_BADGE: Record<string, string> = {
  HIGH: "bg-[oklch(96%_0.05_27)] text-[oklch(42%_0.21_27)]",
  MEDIUM: "bg-[oklch(96%_0.05_55)] text-[oklch(42%_0.18_55)]",
  LOW: "bg-[oklch(95%_0.05_148)] text-[oklch(42%_0.17_148)]",
};

const PRIORITY_LABEL: Record<string, string> = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  );
}

export function ActivityTabs({ projectProgress, recentActivity }: Props) {
  const [tab, setTab] = useState<"progress" | "activity">("progress");

  const tabs = [
    { id: "progress" as const, label: "Project Progress" },
    { id: "activity" as const, label: "Recent Activity" },
  ];

  return (
    <div className="bg-card rounded-[12px] border border-border shadow-[0_1px_4px_oklch(0%_0_0/4%)]">
      {/* Header with tabs */}
      <div className="flex items-center gap-1.5 px-4 pt-4 pb-0 border-b border-border">
        <Activity className="w-3.5 h-3.5 text-muted flex-shrink-0" />
        <div className="flex items-center gap-0.5 ml-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2 text-[13px] font-semibold rounded-t-lg transition-colors border-b-2 -mb-px",
                tab === t.id
                  ? "text-brand border-brand"
                  : "text-muted border-transparent hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {tab === "progress" && (
          <div className="space-y-2.5">
            {projectProgress.length === 0 ? (
              <p className="text-[13px] text-muted text-center py-6">No projects yet</p>
            ) : projectProgress.map((p) => {
              const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
              const inPct = p.total > 0 ? Math.round((p.inProgress / p.total) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-4 p-3.5 rounded-[10px] border border-border hover:border-brand/30 hover:bg-brand-subtle/30 transition-all group"
                >
                  <div className="w-8 h-8 rounded-[8px] bg-brand-subtle flex items-center justify-center flex-shrink-0 group-hover:bg-brand/15 transition-colors">
                    <span className="text-[13px] font-bold text-brand">{p.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-foreground group-hover:text-brand transition-colors truncate pr-4">
                        {p.name}
                      </span>
                      <span className="text-[11px] text-muted flex-shrink-0 flex items-center gap-1">
                        {p.done}/{p.total}
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden flex">
                      <div className="h-full bg-status-done transition-all" style={{ width: `${pct}%` }} />
                      <div className="h-full bg-status-progress transition-all" style={{ width: `${inPct}%` }} />
                    </div>
                    <div className="flex gap-3 mt-1">
                      <Legend color="oklch(57% 0.2 148)" label={`${pct}% done`} />
                      <Legend color="oklch(57% 0.21 228)" label={`${inPct}% in progress`} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {tab === "activity" && (
          <div>
            {recentActivity.length === 0 ? (
              <p className="text-[13px] text-muted text-center py-6">No recent activity</p>
            ) : (
              <div className="divide-y divide-border rounded-[10px] border border-border overflow-hidden">
                {recentActivity.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[t.status] ?? "bg-muted"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground font-medium truncate">{t.title}</p>
                      <p className="text-[11px] text-muted mt-0.5">
                        {t.projectName}
                        {t.assigneeName && ` · ${t.assigneeName}`}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${PRIORITY_BADGE[t.priority]}`}>
                        {PRIORITY_LABEL[t.priority]}
                      </span>
                      <span className="text-[10px] text-muted">{timeAgo(t.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
