import { createServerCaller } from "@/lib/trpc/server";
import { ProjectsList } from "./projects-list";

export default async function ProjectsPage() {
  const trpc = await createServerCaller();
  const { workspace, isOwner } = await trpc.workspace.getCurrent();
  const projects = await trpc.projects.list({ workspaceId: workspace.id });

  return (
    <ProjectsList
      workspaceId={workspace.id}
      isOwner={isOwner}
      initialProjects={projects}
    />
  );
}
