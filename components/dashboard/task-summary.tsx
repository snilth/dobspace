import { AlertCircle, BarChart3, CheckCircle2, Clock, Eye, Inbox, ListTodo } from "lucide-react";

type Kpi = {
  total: number;
  backlog: number;
  inProgress: number;
  review: number;
  done: number;
  overdue: number;
};

export function TaskSummary({ kpi }: { kpi: Kpi }) {
  const stats: Array<{
    key: keyof Kpi;
    label: string;
    icon: typeof ListTodo;
    color: string;
    bg: string;
  }> = [
    { key: "total", label: "Total Tasks", icon: ListTodo, color: "text-brand", bg: "bg-brand-subtle" },
    { key: "backlog", label: "Backlog", icon: Inbox, color: "text-[oklch(45%_0.01_258)]", bg: "bg-surface-3" },
    { key: "inProgress", label: "In Progress", icon: Clock, color: "text-[oklch(42%_0.18_228)]", bg: "bg-[oklch(92%_0.05_228)]" },
    { key: "review", label: "In Review", icon: Eye, color: "text-[oklch(45%_0.18_55)]", bg: "bg-[oklch(92%_0.05_55)]" },
    { key: "done", label: "Done", icon: CheckCircle2, color: "text-[oklch(40%_0.17_148)]", bg: "bg-[oklch(92%_0.05_148)]" },
    {
      key: "overdue",
      label: "Overdue",
      icon: AlertCircle,
      color: kpi.overdue > 0 ? "text-error" : "text-[oklch(40%_0.17_148)]",
      bg: kpi.overdue > 0 ? "bg-[oklch(93%_0.04_27)]" : "bg-[oklch(92%_0.05_148)]",
    },
  ];

  return (
    <div className="bg-card rounded-card border border-border p-4 shadow-[0_1px_4px_oklch(0%_0_0/4%)]">
      <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-border">
        <BarChart3 className="w-3.5 h-3.5 text-muted" />
        <h2 className="text-[13px] font-semibold text-foreground">Overall Task Summary</h2>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex flex-col gap-2">
              <div className={`w-7 h-7 rounded-btn flex items-center justify-center ${s.bg} ${s.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground tracking-tight tabular-nums">{kpi[s.key]}</p>
                <p className="text-[11px] text-muted">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
