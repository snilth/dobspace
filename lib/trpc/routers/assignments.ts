import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { AssignmentType, Priority } from "@prisma/client";
import { requireCourseOwner, requireAssignmentOwner } from "@/lib/trpc/guards";

const AssignmentInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  dueDate: z.string().datetime(),
  reminder: z.string().max(280).nullable().optional(),
  type: z.nativeEnum(AssignmentType).optional(),
  priority: z.nativeEnum(Priority).optional(),
});

export const assignmentsRouter = router({
  create: protectedProcedure
    .input(z.object({ courseId: z.string(), data: AssignmentInput }))
    .mutation(async ({ ctx, input }) => {
      await requireCourseOwner(ctx.prisma, ctx.session.user.id, input.courseId);
      const { dueDate, type, priority, ...rest } = input.data;
      return ctx.prisma.assignment.create({
        data: {
          ...rest,
          courseId: input.courseId,
          dueDate: new Date(dueDate),
          type: type ?? "HOMEWORK",
          priority: priority ?? "MEDIUM",
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: AssignmentInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      await requireAssignmentOwner(ctx.prisma, ctx.session.user.id, input.id);
      const { dueDate, ...rest } = input.data;
      return ctx.prisma.assignment.update({
        where: { id: input.id },
        data: { ...rest, ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}) },
      });
    }),

  toggleDone: protectedProcedure
    .input(z.object({ id: z.string(), done: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await requireAssignmentOwner(ctx.prisma, ctx.session.user.id, input.id);
      return ctx.prisma.assignment.update({ where: { id: input.id }, data: { done: input.done } });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireAssignmentOwner(ctx.prisma, ctx.session.user.id, input.id);
      return ctx.prisma.assignment.delete({ where: { id: input.id } });
    }),

  reminders: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.assignment.findMany({
      where: {
        done: false,
        reminder: { not: null },
        course: { userId: ctx.session.user.id },
      },
      include: { course: { select: { id: true, name: true, color: true } } },
      orderBy: { dueDate: "asc" },
    });
  }),
});
