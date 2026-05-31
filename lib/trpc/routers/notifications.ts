import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";

export const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
            project: { select: { id: true, name: true } },
            assignees: {
              include: { assignedByUser: { select: { name: true } } },
              take: 1,
              orderBy: { assignedAt: "desc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.count({
      where: { userId: ctx.session.user.id, read: false },
    });
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { read: true },
      });
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.notification.updateMany({
      where: { userId: ctx.session.user.id, read: false },
      data: { read: true },
    });
  }),
});
