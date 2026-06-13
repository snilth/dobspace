type Kpi = {
  total: number;
  backlog: number;
  inProgress: number;
  review: number;
  done: number;
  overdue: number;
};

const STATUS_STATS = [
  { key: "backlog", label: "Backlog", color: "bg-status-backlog" },
  { key: "inProgress", label: "In Progress", color: "bg-status-progress" },
  { key: "review", label: "In Review", color: "bg-status-review" },
  { key: "done", label: "Done", color: "bg-status-done" },
] as const;

function Divider() {
  return <div className="w-px h-7 bg-border" aria-hidden />;
}

export function StatRow({ kpi }: { kpi: Kpi }) {
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold text-foreground tabular-nums">{kpi.total}</span>
        <span className="text-sm text-muted">tasks</span>
      </div>

      <Divider />

      {STATUS_STATS.map((s) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${s.color}`} aria-hidden />
          <span className="text-sm font-semibold text-foreground tabular-nums">{kpi[s.key]}</span>
          <span className="text-sm text-muted">{s.label}</span>
        </div>
      ))}

      {kpi.overdue > 0 && (
        <>
          <Divider />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-error" aria-hidden />
            <span className="text-sm font-semibold text-error tabular-nums">{kpi.overdue}</span>
            <span className="text-sm text-muted">overdue</span>
          </div>
        </>
      )}
    </div>
  );
}
