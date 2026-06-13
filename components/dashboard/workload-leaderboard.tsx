import { Trophy } from "lucide-react";

type WorkloadEntry = { name: string; image: string | null; count: number };

const RANK_STYLE = [
  "bg-[oklch(88%_0.09_88)] text-[oklch(40%_0.08_88)]",
  "bg-[oklch(90%_0.01_258)] text-[oklch(45%_0.02_258)]",
  "bg-[oklch(89%_0.06_55)] text-[oklch(42%_0.1_55)]",
];

export function WorkloadLeaderboard({ workload }: { workload: WorkloadEntry[] }) {
  const items = workload.slice(0, 5);

  return (
    <div className="bg-card rounded-card border border-border shadow-[0_1px_4px_oklch(0%_0_0/4%)]">
      <div className="flex items-center gap-1.5 px-4 py-3.5 border-b border-border">
        <Trophy className="w-3.5 h-3.5 text-muted" />
        <h2 className="text-[13px] font-semibold text-foreground">Workload</h2>
      </div>

      <div className="p-4">
        {items.length === 0 ? (
          <p className="text-[13px] text-muted text-center py-6">No active tasks assigned</p>
        ) : (
          <div className="space-y-1">
            {items.map((w, i) => (
              <div key={w.name} className="flex items-center gap-3 py-1.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    RANK_STYLE[i] ?? "bg-surface-2 text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="w-7 h-7 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {w.image ? (
                    <img src={w.image} alt={w.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-brand">{w.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <span className="text-[13px] font-medium text-foreground flex-1 truncate">{w.name}</span>
                <span className="text-[11px] font-semibold text-muted flex-shrink-0">{w.count} tasks</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
