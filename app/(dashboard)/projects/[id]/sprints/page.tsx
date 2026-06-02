import { createServerCaller } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { LayoutGrid, Layers } from "lucide-react";
import { ProjectTeamButton } from "@/components/shared/project-team-button";
import { SprintView } from "@/components/sprint/sprint-view";
import Link from "next/link";

export default async function SprintsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [trpc, session] = await Promise.all([createServerCaller(), getSession()]);

  let project;
  try {
    project = await trpc.projects.get({ id });
  } catch {
    notFound();
  }

  const projectWorkspaceOwnerId = project.workspace.ownerId;
  const isOwner = session?.user.id === projectWorkspaceOwnerId;
  const currentUserPermission = isOwner
    ? "MANAGER"
    : (project.members.find((m) => m.userId === session?.user.id)?.permission ?? "VIEWER");
  const canManage = isOwner || currentUserPermission === "MANAGER";

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
          <Link href={`/projects/${id}`}>
            <HeaderBtn icon={<LayoutGrid className="w-4 h-4" />} label="Board" />
          </Link>
          <HeaderBtn icon={<Layers className="w-4 h-4" />} label="Sprints" active />
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
        <SprintView
          projectId={project.id}
          workspaceId={project.workspaceId}
          canManage={canManage}
        />
      </div>
    </div>
  );
}

function HeaderBtn({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium ${
      active ? "bg-brand-subtle text-brand" : "text-muted hover:bg-surface-2 transition-colors"
    }`}>
      {icon}{label}
    </div>
  );
}
