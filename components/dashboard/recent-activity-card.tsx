import { History } from "lucide-react";

type RecentActivity = {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectName: string;
  assigneeName: string | null;
  updatedAt: Date;
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

export function RecentActivityCard({ activity }: { activity: RecentActivity[] }) {
  return (
    <div className="bg-card rounded-card border border-border shadow-[0_1px_4px_oklch(0%_0_0/4%)]">
      <div className="flex items-center gap-1.5 px-4 py-3.5 border-b border-border">
        <History className="w-3.5 h-3.5 text-muted" />
        <h2 className="text-[13px] font-semibold text-foreground">Recent Activity</h2>
      </div>

      {activity.length === 0 ? (
        <p className="text-[13px] text-muted text-center py-10">No recent activity</p>
      ) : (
        <div className="divide-y divide-border">
          {activity.map((t) => (
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
  );
}
