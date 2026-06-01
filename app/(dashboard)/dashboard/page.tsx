import { createServerCaller } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { ActivityTabs } from "@/components/dashboard/activity-tabs";
import {
  CheckCircle2, Clock, AlertCircle,
  ListTodo, Users, TrendingUp,
} from "lucide-react";


export default async function DashboardPage() {
  const trpc = await createServerCaller();
  const session = await getSession();
  const { workspace, isOwner } = await trpc.workspace.getCurrent();
  const workspaceId = workspace.id;

  const [projects, members, stats] = await Promise.all([
    trpc.projects.list({ workspaceId }),
    trpc.workspace.membersWithProjects({ workspaceId }),
    trpc.dashboard.stats({ workspaceId }),
  ]);

  const activeProjects = projects.filter((p: typeof projects[number]) => p.status === "ACTIVE");
  const donePercent = stats.kpi.total > 0
    ? Math.round((stats.kpi.done / stats.kpi.total) * 100)
    : 0;

  return (
    <div className="p-6 max-w-[1280px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Workspace Overview
          </p>
          <h1 className="text-[22px] font-bold text-foreground leading-none">{workspace.name}</h1>
          <p className="text-sm text-muted mt-1.5">
            <span className="font-medium text-foreground-2">{members.length}</span> members
            {" · "}
            <span className="font-medium text-foreground-2">{activeProjects.length}</span> active projects
          </p>
        </div>
        <div />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<ListTodo className="w-4 h-4" />}
          label="Total Tasks"
          value={stats.kpi.total}
          sub={`${donePercent}% done`}
          iconColor="text-brand"
          iconBg="bg-brand-subtle"
        />
        <KpiCard
          icon={<Clock className="w-4 h-4" />}
          label="In Progress"
          value={stats.kpi.inProgress}
          sub={`${stats.kpi.review} in review`}
          iconColor="text-[oklch(42%_0.18_228)]"
          iconBg="bg-[oklch(92%_0.05_228)]"
        />
        <KpiCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Done"
          value={stats.kpi.done}
          sub={`${stats.kpi.backlog} in backlog`}
          iconColor="text-[oklch(40%_0.17_148)]"
          iconBg="bg-[oklch(92%_0.05_148)]"
        />
        <KpiCard
          icon={<AlertCircle className="w-4 h-4" />}
          label="Overdue"
          value={stats.kpi.overdue}
          sub="incomplete tasks"
          iconColor={stats.kpi.overdue > 0 ? "text-error" : "text-[oklch(40%_0.17_148)]"}
          iconBg={stats.kpi.overdue > 0 ? "bg-[oklch(93%_0.04_27)]" : "bg-[oklch(92%_0.05_148)]"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: tabbed card */}
        <div className="lg:col-span-2">
          <ActivityTabs
            projectProgress={stats.projectProgress}
            recentActivity={stats.recentActivity}
          />
        </div>

        {/* Right: workload + members */}
        <div className="space-y-5">
          {stats.workload.length > 0 && (
            <Card title="Team Workload" icon={<Users className="w-3.5 h-3.5" />}>
              <div className="space-y-3">
                {stats.workload.map((w) => {
                  const max = stats.workload[0]?.count ?? 1;
                  const pct = max > 0 ? Math.round((w.count / max) * 100) : 0;
                  return (
                    <div key={w.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {w.image
                              ? <img src={w.image} alt={w.name} className="w-full h-full object-cover" />
                              : <span className="text-[9px] font-bold text-brand">{w.name.slice(0, 2).toUpperCase()}</span>}
                          </div>
                          <span className="text-[12px] font-medium text-foreground">{w.name}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-muted">{w.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card title={`Team (${members.length})`} icon={<Users className="w-3.5 h-3.5" />}>
            <div className="divide-y divide-border">
              {members.map((m) => {
                const isMe = m.userId === session?.user.id;
                const isMemberOwner = m.userId === workspace.ownerId;
                return (
                  <div key={m.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                      {m.user.image
                        ? <img src={m.user.image} alt={m.user.name} className="w-full h-full object-cover" />
                        : <span className="text-[11px] font-bold text-brand">{m.user.name.slice(0, 2).toUpperCase()}</span>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name + badges */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <p className="text-[13px] font-semibold text-foreground truncate">{m.user.name}</p>
                        {isMe && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-subtle text-brand border border-brand-muted shrink-0">
                            you
                          </span>
                        )}
                        {isMemberOwner && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[oklch(95%_0.05_278)] text-[oklch(42%_0.2_278)] border border-[oklch(85%_0.08_278)] shrink-0 dark:bg-[oklch(22%_0.05_278)] dark:text-[oklch(72%_0.15_278)] dark:border-[oklch(32%_0.08_278)]">
                            owner
                          </span>
                        )}
                      </div>

                      {/* Projects */}
                      {m.projects.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {m.projects.map((p) => (
                            <Link key={p.id} href={`/projects/${p.id}`}
                              className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-surface-2 hover:bg-brand-subtle hover:text-brand border border-border hover:border-brand-muted transition-colors group/proj">
                              <span className="text-[11px] font-medium text-foreground-2 group-hover/proj:text-brand truncate max-w-[90px]">{p.name}</span>
                              {p.tag && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-brand text-brand-foreground shrink-0">
                                  {p.tag}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-2 italic">Not in any project</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}

function KpiCard({ icon, label, value, sub, iconColor, iconBg }: {
  icon: React.ReactNode; label: string; value: number; sub: string;
  iconColor: string; iconBg: string;
}) {
  return (
    <div className="p-4 rounded-[12px] border border-border bg-card">
      <div className={`w-8 h-8 rounded-[8px] ${iconBg} flex items-center justify-center mb-3 ${iconColor}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-[12px] font-semibold text-foreground-2 mt-0.5">{label}</p>
      <p className="text-[11px] text-muted mt-0.5">{sub}</p>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-[12px] border border-border p-4 shadow-[0_1px_4px_oklch(0%_0_0/4%)]">
      <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-border">
        <span className="text-muted">{icon}</span>
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}


