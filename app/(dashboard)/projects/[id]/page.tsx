import { createServerCaller } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import { KanbanBoard, type BoardTask } from "@/components/kanban/kanban-board";
import { LayoutGrid } from "lucide-react";
import { ProjectTeamButton } from "@/components/shared/project-team-button";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [trpc, session] = await Promise.all([
    createServerCaller(),
    getSession(),
  ]);

  let project;
  try {
    project = await trpc.projects.get({ id });
  } catch {
    notFound();
  }

  const projectWorkspaceOwnerId = project.workspace.ownerId;
  const isProjectWorkspaceOwner = session?.user.id === projectWorkspaceOwnerId;

  const currentUserProjectPermission = isProjectWorkspaceOwner
    ? "MANAGER"
    : (project.members.find((m) => m.userId === session?.user.id)?.permission ?? "VIEWER");

  const canManage = isProjectWorkspaceOwner || currentUserProjectPermission === "MANAGER";

  const memberTagMap = new Map(project.members.map((m): [string, string | null] => [m.userId, m.tag ?? null]));

  const tasks: BoardTask[] = project.tasks.map((t) => {
    const assigneeUser = t.assignees[0]?.user ?? null;
    return {
      id: t.id,
      projectId: project.id,
      title: t.title,
      description: t.description,
      note: t.note,
      status: t.status as BoardTask["status"],
      priority: t.priority as BoardTask["priority"],
      tags: t.tags,
      dueDate: t.dueDate,
      sprintId: t.sprintId,
      assignee: assigneeUser ? { ...assigneeUser, tag: memberTagMap.get(assigneeUser.id) ?? null } : null,
    };
  });

  return (
    <div className="flex h-full min-h-screen flex-col">
      <div className="flex items-center justify-between px-6 h-[54px] border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-[8px] bg-brand-subtle flex items-center justify-center">
            <span className="text-[13px] font-bold text-brand">{project.name[0]}</span>
          </div>
          <span className="font-semibold text-foreground text-[14px]">{project.name}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <HeaderBtn icon={<LayoutGrid className="w-4 h-4" />} label="Board" active />
          <ProjectTeamButton
            workspaceId={project.workspaceId}
            workspaceName=""
            projectId={project.id}
            projectName={project.name}
            joinCode={project.joinCode}
            canManage={canManage}
            currentUserId={session?.user.id ?? ""}
            workspaceOwnerId={projectWorkspaceOwnerId}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-surface-2/40">
          <div className="pt-5">
            <KanbanBoard
              initialTasks={tasks}
              projectId={project.id}
              workspaceId={project.workspaceId}
              currentUserId={session?.user.id ?? ""}
              permission={currentUserProjectPermission as "VIEWER" | "EDITOR" | "MANAGER"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderBtn({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium ${
      active ? "bg-brand-subtle text-brand" : "text-muted"
    }`}>
      {icon}{label}
    </div>
  );
}
