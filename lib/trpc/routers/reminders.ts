import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";

const ReminderInput = z.object({
  text: z.string().min(1).max(280),
  remindAt: z.string().datetime(),
});

export const remindersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.reminder.findMany({
      where: { userId: ctx.session.user.id, dismissed: false },
      orderBy: { remindAt: "asc" },
    });
  }),

  create: protectedProcedure
    .input(ReminderInput)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.reminder.create({
        data: {
          userId: ctx.session.user.id,
          text: input.text,
          remindAt: new Date(input.remindAt),
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: ReminderInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const reminder = await ctx.prisma.reminder.findUnique({ where: { id: input.id } });
      if (!reminder || reminder.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const { remindAt, ...rest } = input.data;
      return ctx.prisma.reminder.update({
        where: { id: input.id },
        data: {
          ...rest,
          ...(remindAt !== undefined ? { remindAt: new Date(remindAt), notifiedAt: null } : {}),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reminder = await ctx.prisma.reminder.findUnique({ where: { id: input.id } });
      if (!reminder || reminder.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.prisma.reminder.delete({ where: { id: input.id } });
    }),
});
