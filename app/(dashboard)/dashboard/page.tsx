import { createServerCaller } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { Plus } from "lucide-react";
import { StatRow } from "@/components/dashboard/stat-row";
import { ProjectProgressCard } from "@/components/dashboard/project-progress-card";
import { RecentActivityCard } from "@/components/dashboard/recent-activity-card";
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

  return (
    <div className="p-6 max-w-[1280px] mx-auto space-y-6">
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
        <Link
          href="/projects/new"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand text-brand-foreground text-sm font-semibold rounded-btn hover:bg-brand-dark transition-all shadow-sm shadow-brand/20 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Task breakdown */}
      <StatRow kpi={stats.kpi} />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <ProjectProgressCard projects={stats.projectProgress} />
          <RecentActivityCard activity={stats.recentActivity} />
        </div>

        <TeamCard
          workload={stats.workload}
          members={members}
          currentUserId={session?.user.id}
          ownerId={workspace.ownerId}
        />
      </div>
    </div>
  );
}
