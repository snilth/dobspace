import { createServerCaller } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import { TrendingUp } from "lucide-react";
import { ActivityTabs } from "@/components/dashboard/activity-tabs";
import { TaskSummary } from "@/components/dashboard/task-summary";
import { TodoListCard } from "@/components/dashboard/todo-list-card";
import { TeamCard } from "@/components/dashboard/team-card";
import { RemindersCard } from "@/components/dashboard/reminders-card";

export default async function DashboardPage() {
  const trpc = await createServerCaller();
  const session = await getSession();
  const { workspace, isOwner } = await trpc.workspace.getCurrent();
  const workspaceId = workspace.id;

  const [projects, members, stats, reminders] = await Promise.all([
    trpc.projects.list({ workspaceId }),
    trpc.workspace.membersWithProjects({ workspaceId }),
    trpc.dashboard.stats({ workspaceId }),
    trpc.assignments.reminders(),
  ]);

  const activeProjects = projects.filter((p: typeof projects[number]) => p.status === "ACTIVE");

  return (
    <div className="p-6 max-w-[1280px] mx-auto flex flex-col gap-6 lg:h-full lg:overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between lg:shrink-0">
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

      {/* Overall Task Summary */}
      <div className="lg:shrink-0">
        <TaskSummary kpi={stats.kpi} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* Section 1: Project Progress / Recent Activity */}
        <div className="lg:h-full lg:min-h-0">
          <ActivityTabs
            projectProgress={stats.projectProgress}
            recentActivity={stats.recentActivity}
          />
        </div>

        {/* Section 2: To-Dos */}
        <div className="flex flex-col gap-5 lg:h-full lg:min-h-0">
          <TodoListCard workspaceId={workspaceId} />
          <RemindersCard assignments={reminders} />
        </div>

        {/* Section 3: Team Workload / Members */}
        <div className="lg:h-full lg:min-h-0">
          <TeamCard
            workload={stats.workload}
            members={members}
            currentUserId={session?.user.id}
            ownerId={workspace.ownerId}
          />
        </div>
      </div>
    </div>
  );
}
