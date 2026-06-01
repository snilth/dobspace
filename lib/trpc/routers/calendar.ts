import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { requireWorkspaceMember } from "@/lib/trpc/guards";

export const calendarRouter = router({
  tasks: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }))
    .query(async ({ ctx, input }) => {
      await requireWorkspaceMember(ctx.prisma, ctx.session.user.id, input.workspaceId);

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);

      const tasks = await ctx.prisma.task.findMany({
        where: {
          project: { workspaceId: input.workspaceId, status: "ACTIVE" },
          dueDate: { gte: startDate, lte: endDate },
          status: { not: "DONE" },
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          tags: true,
          dueDate: true,
          sprintId: true,
          projectId: true,
          project: { select: { id: true, name: true } },
          assignees: {
            take: 1,
            include: { user: { select: { id: true, name: true, image: true } } },
          },
        },
        orderBy: { dueDate: "asc" },
      });

      return tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status as "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE",
        priority: t.priority as "LOW" | "MEDIUM" | "HIGH",
        tags: t.tags,
        dueDate: t.dueDate!,
        sprintId: t.sprintId,
        projectId: t.projectId,
        project: t.project,
        assignee: t.assignees[0]
          ? { id: t.assignees[0].user.id, name: t.assignees[0].user.name, image: t.assignees[0].user.image ?? null, tag: null }
          : null,
      }));
    }),
});
