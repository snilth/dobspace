import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { requireWorkspaceMember } from "@/lib/trpc/guards";

export const dashboardRouter = router({
  stats: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();

      await requireWorkspaceMember(ctx.prisma, ctx.session.user.id, input.workspaceId);
      const [projects] = await Promise.all([
        ctx.prisma.project.findMany({
          where: { workspaceId: input.workspaceId, status: "ACTIVE" },
          select: { id: true, name: true },
        }),
      ]);

      const projectIds = projects.map((p) => p.id);

      const [tasksByStatus, overdueTasks, tasksByProject, workloadRaw, recentActivity] =
        await Promise.all([
          ctx.prisma.task.groupBy({
            by: ["status"],
            where: { projectId: { in: projectIds } },
            _count: { _all: true },
          }),
          ctx.prisma.task.count({
            where: { projectId: { in: projectIds }, dueDate: { lt: now }, status: { not: "DONE" } },
          }),
          ctx.prisma.task.groupBy({
            by: ["projectId", "status"],
            where: { projectId: { in: projectIds } },
            _count: { _all: true },
          }),
          ctx.prisma.taskAssignee.findMany({
            where: { task: { projectId: { in: projectIds }, status: { not: "DONE" } } },
            select: { userId: true, user: { select: { name: true, image: true } } },
          }),
          ctx.prisma.task.findMany({
            where: { projectId: { in: projectIds } },
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              updatedAt: true,
              project: { select: { name: true } },
              assignees: {
                take: 1,
                include: { user: { select: { name: true } } },
              },
            },
            orderBy: { updatedAt: "desc" },
            take: 10,
          }),
        ]);

      const statusMap = Object.fromEntries(
        tasksByStatus.map((r) => [r.status, r._count._all])
      ) as Record<string, number>;

      const total =
        (statusMap.BACKLOG ?? 0) +
        (statusMap.IN_PROGRESS ?? 0) +
        (statusMap.REVIEW ?? 0) +
        (statusMap.DONE ?? 0);

      const projectTaskMap: Record<string, Record<string, number>> = {};
      for (const row of tasksByProject) {
        if (!projectTaskMap[row.projectId]) projectTaskMap[row.projectId] = {};
        projectTaskMap[row.projectId][row.status] = row._count._all;
      }

      const workloadCounts = new Map<string, { name: string; image: string | null; count: number }>();
      for (const row of workloadRaw) {
        const entry = workloadCounts.get(row.userId);
        if (entry) entry.count++;
        else workloadCounts.set(row.userId, { name: row.user.name, image: row.user.image ?? null, count: 1 });
      }
      const workload = [...workloadCounts.values()].sort((a, b) => b.count - a.count);

      return {
        kpi: {
          total,
          backlog: statusMap.BACKLOG ?? 0,
          inProgress: statusMap.IN_PROGRESS ?? 0,
          review: statusMap.REVIEW ?? 0,
          done: statusMap.DONE ?? 0,
          overdue: overdueTasks,
        },
        projectProgress: projects.map((p) => {
          const counts = projectTaskMap[p.id] ?? {};
          const projectTotal = Object.values(counts).reduce((a, b) => a + b, 0);
          return {
            id: p.id,
            name: p.name,

            total: projectTotal,
            done: counts.DONE ?? 0,
            inProgress: counts.IN_PROGRESS ?? 0,
          };
        }),
        workload,
        recentActivity: recentActivity.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          projectName: t.project.name,
          assigneeName: t.assignees[0]?.user.name ?? null,
          updatedAt: t.updatedAt,
        })),
      };
    }),
});
