import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";
import { requireCourseOwner } from "@/lib/trpc/guards";

const CourseInput = z.object({
  name: z.string().min(1).max(100),
  term: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const coursesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.course.findMany({
      where: { userId: ctx.session.user.id },
      include: { _count: { select: { assignments: { where: { done: false } } } } },
      orderBy: { createdAt: "asc" },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.prisma.course.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        include: {
          assignments: { orderBy: [{ done: "asc" }, { dueDate: "asc" }] },
        },
      });
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      return course;
    }),

  create: protectedProcedure
    .input(CourseInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.course.create({
        data: { ...input, userId: ctx.session.user.id },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: CourseInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      await requireCourseOwner(ctx.prisma, ctx.session.user.id, input.id);
      return ctx.prisma.course.update({ where: { id: input.id }, data: input.data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireCourseOwner(ctx.prisma, ctx.session.user.id, input.id);
      return ctx.prisma.course.delete({ where: { id: input.id } });
    }),
});
