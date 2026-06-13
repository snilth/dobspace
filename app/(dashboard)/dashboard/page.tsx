import { createServerCaller } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { ProgressOverview } from "@/components/dashboard/progress-overview";
import { ProjectProgressCard } from "@/components/dashboard/project-progress-card";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
import { TrendingUp, Plus, Users } from "lucide-react";
import { isSafeImageSrc } from "@/components/shared/avatar";

export default async function DashboardPage() {
  const trpc = await createServerCaller();
  const session = await getSession();
  const { workspace } = await trpc.workspace.getCurrent();
  const workspaceId = workspace.id;

  const [projects, members, stats] = await Promise.all([
    trpc.projects.list({ workspaceId }),
    trpc.workspace.membersWithProjects({ workspaceId }),
    trpc.dashboard.stats({ workspaceId }),
  ]);

  const activeProjects = projects.filter((p: typeof projects[number]) => p.status === "ACTIVE");

  return (
    <div className="p-6 max-w-[1280px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
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
        <Link
          href="/projects/new"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand text-brand-foreground text-sm font-semibold rounded-btn hover:bg-brand-dark transition-all shadow-sm shadow-brand/20 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Progress overview */}
      <ProgressOverview kpi={stats.kpi} />

      {/* Project progress + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProjectProgressCard projects={stats.projectProgress} />
        <RecentActivityCard activity={stats.recentActivity} />
      </div>

      {/* Team workload + members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
                    {m.user.image && isSafeImageSrc(m.user.image)
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
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-card border border-border p-4 shadow-[0_1px_4px_oklch(0%_0_0/4%)]">
      <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-border">
        <span className="text-muted">{icon}</span>
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}
