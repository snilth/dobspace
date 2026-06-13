import Link from "next/link";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectName: string;
  assigneeName: string | null;
  updatedAt: Date;
};

const PRIORITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  HIGH: { bg: "bg-[oklch(95%_0.045_27)]", text: "text-[oklch(42%_0.21_27)]", label: "High Priority" },
  MEDIUM: { bg: "bg-[oklch(95%_0.045_55)]", text: "text-[oklch(42%_0.18_55)]", label: "Medium Priority" },
  LOW: { bg: "bg-[oklch(94%_0.045_148)]", text: "text-[oklch(42%_0.17_148)]", label: "Low Priority" },
};

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: "Backlog",
  IN_PROGRESS: "In Progress",
  REVIEW: "In Review",
  DONE: "Done",
};

export function HighlightTasks({ tasks }: { tasks: Task[] }) {
  const items = tasks.slice(0, 3);

  return (
    <div className="bg-card rounded-card border border-border shadow-[0_1px_4px_oklch(0%_0_0/4%)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-foreground">Recent Tasks</h2>
        <Link href="/calendar" className="text-xs font-medium text-brand hover:underline">
          See all
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-muted text-center py-10">No tasks yet</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {items.map((t) => {
            const p = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.LOW;
            return (
              <div key={t.id} className={`rounded-btn p-3.5 ${p.bg} flex flex-col gap-2 min-h-[122px]`}>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${p.text}`}>{p.label}</span>
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{t.title}</p>
                <p className="text-[11px] text-muted truncate">{t.projectName}</p>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-foreground-2 truncate">
                    {t.assigneeName ?? "Unassigned"}
                  </span>
                  <span className={`text-[10px] font-semibold ${p.text} flex-shrink-0`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
