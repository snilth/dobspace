import Link from "next/link";
import { FolderKanban, ArrowUpRight } from "lucide-react";

type ProjectProgress = {
  id: string;
  name: string;
  total: number;
  done: number;
  inProgress: number;
};

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  );
}

export function ProjectProgressCard({ projects }: { projects: ProjectProgress[] }) {
  return (
    <div className="bg-card rounded-card border border-border shadow-[0_1px_4px_oklch(0%_0_0/4%)]">
      <div className="flex items-center gap-1.5 px-4 py-3.5 border-b border-border">
        <FolderKanban className="w-3.5 h-3.5 text-muted" />
        <h2 className="text-[13px] font-semibold text-foreground">Project Progress</h2>
      </div>

      <div className="p-4 space-y-2.5">
        {projects.length === 0 ? (
          <p className="text-[13px] text-muted text-center py-10">No projects yet</p>
        ) : projects.map((p) => {
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          const inPct = p.total > 0 ? Math.round((p.inProgress / p.total) * 100) : 0;
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center gap-4 p-3.5 rounded-btn border border-border hover:border-brand/30 hover:bg-brand-subtle/30 transition-all group"
            >
              <div className="w-8 h-8 rounded-btn bg-brand-subtle flex items-center justify-center flex-shrink-0 group-hover:bg-brand/15 transition-colors">
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
    </div>
  );
}
