import { createServerCaller } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { Plus } from "lucide-react";
import { isSafeImageSrc } from "@/components/shared/avatar";
import { HighlightTasks } from "@/components/dashboard/highlight-tasks";
import { CompletionDonut } from "@/components/dashboard/completion-donut";
import { ProjectProgressCard } from "@/components/dashboard/project-progress-card";
import { WorkloadLeaderboard } from "@/components/dashboard/workload-leaderboard";
import { TeamCard } from "@/components/dashboard/team-card";

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
  const extraMembers = members.length - 5;

  return (
    <div className="p-6 max-w-[1280px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground leading-none">{workspace.name}</h1>
          <p className="text-sm text-muted mt-1.5">
            <span className="font-medium text-foreground-2">{members.length}</span> members
            {" · "}
            <span className="font-medium text-foreground-2">{activeProjects.length}</span> active projects
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center -space-x-2">
            {members.slice(0, 5).map((m) => (
              <div
                key={m.id}
                className="w-8 h-8 rounded-full border-2 border-background bg-brand-subtle flex items-center justify-center overflow-hidden"
                title={m.user.name}
              >
                {m.user.image && isSafeImageSrc(m.user.image) ? (
                  <img src={m.user.image} alt={m.user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-brand">{m.user.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
            ))}
            {extraMembers > 0 && (
              <div className="w-8 h-8 rounded-full border-2 border-background bg-surface-3 flex items-center justify-center text-[10px] font-bold text-muted">
                +{extraMembers}
              </div>
            )}
          </div>

          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand text-brand-foreground text-sm font-semibold rounded-btn hover:bg-brand-dark transition-all shadow-sm shadow-brand/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Link>
        </div>
      </div>

      {/* Highlights + completion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <HighlightTasks tasks={stats.recentActivity} />
        </div>
        <CompletionDonut kpi={stats.kpi} />
      </div>

      {/* Project progress, workload, team */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ProjectProgressCard projects={stats.projectProgress} />
        <WorkloadLeaderboard workload={stats.workload} />
        <TeamCard members={members} currentUserId={session?.user.id} ownerId={workspace.ownerId} />
      </div>
    </div>
  );
}
