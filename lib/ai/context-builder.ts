import { prisma } from "@/lib/db/prisma";

export type WorkspaceContext = {
  workspaceName: string;
  today: string;
  members: { name: string; jobRole?: string }[];
  projects: {
    name: string;
    taskCounts: { BACKLOG: number; IN_PROGRESS: number; REVIEW: number; DONE: number };
    activeSprint: { name: string; endDate: string; daysLeft: number } | null;
    overdueTasks: { title: string; assignee?: string; daysOverdue: number }[];
    dueSoonTasks: { title: string; assignee?: string; dueDate: string; daysLeft: number }[];
    inProgressTasks: { title: string; assignee?: string; priority: string; dueDate?: string }[];
  }[];
};

export async function buildWorkspaceContext(workspaceId: string): Promise<WorkspaceContext> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  const [workspace, projects] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        name: true,
        members: {
          select: {
            userId: true,
            user: { select: { name: true } },
            jobRole: { select: { name: true } },
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { workspaceId, status: "ACTIVE" },
      select: {
        name: true,
        tasks: {
          select: {
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assignees: { take: 1, include: { user: { select: { name: true } } } },
          },
        },
        sprints: {
          where: { status: "ACTIVE" },
          select: { name: true, endDate: true },
          take: 1,
        },
      },
      orderBy: { order: "asc" },
    }),
  ]);

  const members = (workspace?.members ?? []).map((m) => ({
    name: m.user.name,
    jobRole: m.jobRole?.name,
  }));

  const projectContexts = projects.map((project) => {
    const taskCounts = { BACKLOG: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
    const overdueTasks: WorkspaceContext["projects"][number]["overdueTasks"] = [];
    const dueSoonTasks: WorkspaceContext["projects"][number]["dueSoonTasks"] = [];
    const inProgressTasks: WorkspaceContext["projects"][number]["inProgressTasks"] = [];

    for (const task of project.tasks) {
      taskCounts[task.status as keyof typeof taskCounts]++;

      const assignee = task.assignees[0]?.user.name;

      if (task.dueDate) {
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

        if (diffDays < 0 && task.status !== "DONE") {
          overdueTasks.push({ title: task.title, assignee, daysOverdue: Math.abs(diffDays) });
        } else if (diffDays >= 0 && diffDays <= 7 && task.status !== "DONE") {
          dueSoonTasks.push({
            title: task.title,
            assignee,
            dueDate: due.toISOString().split("T")[0],
            daysLeft: diffDays,
          });
        }
      }

      if (task.status === "IN_PROGRESS") {
        inProgressTasks.push({
          title: task.title,
          assignee,
          priority: task.priority,
          dueDate: task.dueDate?.toISOString().split("T")[0],
        });
      }
    }

    const sprint = project.sprints[0] ?? null;
    const sprintEnd = sprint ? new Date(sprint.endDate) : null;
    if (sprintEnd) sprintEnd.setHours(0, 0, 0, 0);
    const daysLeft = sprintEnd
      ? Math.round((sprintEnd.getTime() - today.getTime()) / 86400000)
      : 0;

    return {
      name: project.name,
      taskCounts,
      activeSprint: sprint
        ? { name: sprint.name, endDate: sprintEnd!.toISOString().split("T")[0], daysLeft }
        : null,
      overdueTasks: overdueTasks.sort((a, b) => b.daysOverdue - a.daysOverdue),
      dueSoonTasks: dueSoonTasks.sort((a, b) => a.daysLeft - b.daysLeft),
      inProgressTasks,
    };
  });

  return {
    workspaceName: workspace?.name ?? "Workspace",
    today: today.toISOString().split("T")[0],
    members,
    projects: projectContexts,
  };
}
