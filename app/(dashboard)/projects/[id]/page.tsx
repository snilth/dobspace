import { createServerCaller } from "@/lib/trpc/server";
import { auth } from "@/lib/auth";
import { KanbanBoard, type BoardTask } from "@/components/kanban/kanban-board";
import { ChatPanel } from "@/components/chat/chat-panel";
import { LayoutGrid } from "lucide-react";
import { ProjectTeamButton } from "@/components/shared/project-team-button";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [trpc, session] = await Promise.all([
    createServerCaller(),
    auth.api.getSession({ headers: await headers() }),
  ]);

  let project;
  try {
    project = await trpc.projects.get({ id });
  } catch {
    notFound();
  }

  const { isOwner } = await trpc.workspace.getCurrent();

  const currentUserProjectPermission = isOwner
    ? "MANAGER"
    : (project.members.find((m) => m.userId === session?.user.id)?.permission ?? "VIEWER");

  const canManage = isOwner;

  const memberTagMap = new Map(project.members.map((m) => [m.userId, m.tag]));

  const tasks: BoardTask[] = project.tasks.map((t) => {
    const assigneeUser = t.assignees[0]?.user ?? null;
    return {
      id: t.id,
      projectId: project.id,
      title: t.title,
      description: t.description,
      status: t.status as BoardTask["status"],
      priority: t.priority as BoardTask["priority"],
      tags: t.tags,
      dueDate: t.dueDate,
      sprintId: t.sprintId,
      assignee: assigneeUser ? { ...assigneeUser, tag: memberTagMap.get(assigneeUser.id) ?? null } : null,
    };
  });

  const activeSprint = project.sprints.find((s) => s.status === "ACTIVE");

  return (
    <div className="flex h-full min-h-screen flex-col">
      <div className="flex items-center justify-between px-6 h-[54px] border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-[8px] bg-brand-subtle flex items-center justify-center">
            <span className="text-[13px] font-bold text-brand">{project.name[0]}</span>
          </div>
          <span className="font-semibold text-foreground text-[14px]">{project.name}</span>
          {activeSprint && (
            <span className="text-[11px] font-semibold bg-[oklch(93%_0.05_148)] text-[oklch(38%_0.17_148)] px-2.5 py-0.5 rounded-full">
              {activeSprint.name} · Active
            </span>
          )}
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
        <ChatPanel projectId={project.id} />
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
