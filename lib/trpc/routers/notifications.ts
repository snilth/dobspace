import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { runReminderCheck } from "@/lib/jobs/reminder-check";
import { runAssignmentDeadlineCheck } from "@/lib/jobs/assignment-deadline-check";

async function runChecks() {
  await Promise.all([runReminderCheck(), runAssignmentDeadlineCheck()]);
}

export const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    await runChecks();
    return ctx.prisma.notification.findMany({
      where: { userId: ctx.session.user.id, dismissed: false },
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
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            type: true,
            course: { select: { id: true, name: true, color: true } },
          },
        },
        reminder: { select: { id: true, text: true, remindAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    await runChecks();
    return ctx.prisma.notification.count({
      where: { userId: ctx.session.user.id, read: false, dismissed: false },
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
      where: { userId: ctx.session.user.id, read: false, dismissed: false },
      data: { read: true },
    });
  }),

  markUnread: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { read: false },
      });
    }),

  // Soft-delete: hide from UI, kept in DB for 30 days then hard-deleted
  dismiss: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { dismissed: true, dismissedAt: new Date() },
      });
    }),

  clearRead: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.notification.updateMany({
      where: { userId: ctx.session.user.id, read: true, dismissed: false },
      data: { dismissed: true, dismissedAt: new Date() },
    });
  }),
});
