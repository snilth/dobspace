import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { requireWorkspaceMember } from "@/lib/trpc/guards";

export const activityLogRouter = router({
  list: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      entityType: z.enum(["TASK", "SPRINT", "PROJECT", "MEMBER"]).optional(),
      entityId: z.string().optional(),
      userId: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      await requireWorkspaceMember(ctx.prisma, ctx.session.user.id, input.workspaceId);

      const where = {
        workspaceId: input.workspaceId,
        ...(input.entityType ? { entityType: input.entityType } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
      };

      const [logs, total] = await ctx.prisma.$transaction([
        ctx.prisma.activityLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.prisma.activityLog.count({ where }),
      ]);

      return { logs, total };
    }),
});
