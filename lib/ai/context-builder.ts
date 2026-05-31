import { prisma } from "@/lib/db/prisma";

export type ProjectContext = {
  projectName: string;
  taskCounts: { BACKLOG: number; IN_PROGRESS: number; REVIEW: number; DONE: number };
  activeSprint: { name: string; startDate: string; endDate: string; taskCount: number } | null;
  members: { name: string; permission: string; jobRole?: string }[];
  recentTasks: { title: string; status: string; priority: string; assignee?: string; dueDate?: string }[];
  today: string;
};

export async function buildProjectContext(projectId: string): Promise<ProjectContext> {
  const [project, tasks, sprint] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, workspaceId: true },
    }),
    prisma.task.findMany({
      where: { projectId },
      select: {
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignees: { take: 1, include: { user: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.sprint.findFirst({
      where: { projectId, status: "ACTIVE" },
      select: { name: true, startDate: true, endDate: true, _count: { select: { tasks: true } } },
    }),
  ]);

  if (!project) {
    return {
      projectName: "Unknown",
      taskCounts: { BACKLOG: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
      activeSprint: null,
      members: [],
      recentTasks: [],
      today: new Date().toISOString().split("T")[0],
    };
  }

  const [projectMembers, workspace] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      select: {
        userId: true,
        permission: true,
        user: { select: { name: true } },
      },
    }),
    prisma.workspace.findUnique({
      where: { id: project.workspaceId },
      select: {
        ownerId: true,
        owner: { select: { name: true } },
        members: {
          select: {
            userId: true,
            jobRole: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const jobRoleMap = new Map(
    workspace?.members.map((m) => [m.userId, m.jobRole?.name]) ?? []
  );

  const ownerName = workspace?.owner.name;
  const members: ProjectContext["members"] = [];

  if (ownerName) {
    members.push({ name: ownerName, permission: "OWNER" });
  }

  for (const pm of projectMembers) {
    if (pm.userId === workspace?.ownerId) continue;
    members.push({
      name: pm.user.name,
      permission: pm.permission,
      jobRole: jobRoleMap.get(pm.userId) ?? undefined,
    });
  }

  const taskCounts = { BACKLOG: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 } as ProjectContext["taskCounts"];
  for (const t of tasks) {
    taskCounts[t.status as keyof typeof taskCounts]++;
  }

  return {
    projectName: project.name,
    taskCounts,
    activeSprint: sprint
      ? {
          name: sprint.name,
          startDate: sprint.startDate.toISOString().split("T")[0],
          endDate: sprint.endDate.toISOString().split("T")[0],
          taskCount: sprint._count.tasks,
        }
      : null,
    members,
    recentTasks: tasks.slice(0, 20).map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignees[0]?.user.name,
      dueDate: t.dueDate?.toISOString().split("T")[0],
    })),
    today: new Date().toISOString().split("T")[0],
  };
}
