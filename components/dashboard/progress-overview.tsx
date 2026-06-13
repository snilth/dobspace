import { AlertCircle } from "lucide-react";

type Kpi = {
  total: number;
  backlog: number;
  inProgress: number;
  review: number;
  done: number;
  overdue: number;
};

const SEGMENTS = [
  { key: "done", label: "Done", color: "bg-status-done" },
  { key: "inProgress", label: "In Progress", color: "bg-status-progress" },
  { key: "review", label: "In Review", color: "bg-status-review" },
  { key: "backlog", label: "Backlog", color: "bg-status-backlog" },
] as const;

export function ProgressOverview({ kpi }: { kpi: Kpi }) {
  const donePercent = kpi.total > 0 ? Math.round((kpi.done / kpi.total) * 100) : 0;

  return (
    <div className="bg-card rounded-card border border-border p-5 shadow-[0_1px_4px_oklch(0%_0_0/4%)]">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="text-[40px] font-bold text-foreground leading-none tracking-tight tabular-nums">
            {donePercent}%
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Tasks completed</p>
            <p className="text-xs text-muted mt-0.5">{kpi.done} of {kpi.total} tasks done</p>
          </div>
        </div>

        {kpi.overdue > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-[oklch(93%_0.04_27)] text-error text-xs font-semibold flex-shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
            {kpi.overdue} overdue
          </div>
        )}
      </div>

      <div className="h-2.5 rounded-full bg-surface-3 overflow-hidden flex mt-5">
        {kpi.total > 0 && SEGMENTS.map((s) => {
          const value = kpi[s.key];
          return value > 0 ? (
            <div key={s.key} className={`h-full ${s.color}`} style={{ width: `${(value / kpi.total) * 100}%` }} />
          ) : null;
        })}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3.5">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="text-xs text-muted">{s.label}</span>
            <span className="text-xs font-semibold text-foreground-2">{kpi[s.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
