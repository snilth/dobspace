type Kpi = {
  total: number;
  backlog: number;
  inProgress: number;
  review: number;
  done: number;
};

const SEGMENTS = [
  { key: "done", label: "Done", dot: "bg-status-done", color: "var(--color-status-done)" },
  { key: "inProgress", label: "In Progress", dot: "bg-status-progress", color: "var(--color-status-progress)" },
  { key: "review", label: "In Review", dot: "bg-status-review", color: "var(--color-status-review)" },
  { key: "backlog", label: "Backlog", dot: "bg-status-backlog", color: "var(--color-status-backlog)" },
] as const;

export function CompletionDonut({ kpi }: { kpi: Kpi }) {
  const total = kpi.total;
  let acc = 0;
  const stops = SEGMENTS.map((s) => {
    const value = kpi[s.key];
    const pct = total > 0 ? (value / total) * 100 : 0;
    const from = acc;
    acc += pct;
    return `${s.color} ${from}% ${acc}%`;
  }).join(", ");

  const donePct = total > 0 ? Math.round((kpi.done / total) * 100) : 0;

  return (
    <div className="bg-card rounded-card border border-border shadow-[0_1px_4px_oklch(0%_0_0/4%)] p-4 flex flex-col">
      <h2 className="text-[13px] font-semibold text-foreground mb-4">Completion</h2>

      <div className="flex-1 flex items-center justify-center">
        <div
          className="relative w-[136px] h-[136px] rounded-full"
          style={{ background: total > 0 ? `conic-gradient(${stops})` : "var(--color-surface-3)" }}
        >
          <div className="absolute inset-[15px] rounded-full bg-card flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground tabular-nums">{donePct}%</span>
            <span className="text-[11px] text-muted">{kpi.done}/{total} done</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
            <span className="text-xs text-muted truncate">{s.label}</span>
            <span className="text-xs font-semibold text-foreground-2 ml-auto tabular-nums">{kpi[s.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
