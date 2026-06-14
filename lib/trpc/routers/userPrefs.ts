import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { AssignmentType } from "@prisma/client";

const TASK_STATUSES = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"] as const;
const PERSONAL_CALENDAR_KEY = "__personal__";

export const userPrefsRouter = router({
  getKanbanFilter: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { kanbanFilters: true },
      });
      const filters = (user?.kanbanFilters as Record<string, string[]> | null) ?? {};
      return (filters[input.projectId] as typeof TASK_STATUSES[number][] | undefined) ?? null;
    }),

  setKanbanFilter: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      visibleColumns: z.array(z.enum(TASK_STATUSES)),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { kanbanFilters: true },
      });
      const filters = (user?.kanbanFilters as Record<string, string[]> | null) ?? {};
      filters[input.projectId] = input.visibleColumns;
      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { kanbanFilters: filters },
      });
    }),

  getPersonalCalendarFilter: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { calendarFilters: true },
    });
    const filters = (user?.calendarFilters as Record<string, string[]> | null) ?? {};
    return (filters[PERSONAL_CALENDAR_KEY] as AssignmentType[] | undefined) ?? null;
  }),

  setPersonalCalendarFilter: protectedProcedure
    .input(z.object({ hiddenTypes: z.array(z.nativeEnum(AssignmentType)) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { calendarFilters: true },
      });
      const filters = (user?.calendarFilters as Record<string, string[]> | null) ?? {};
      filters[PERSONAL_CALENDAR_KEY] = input.hiddenTypes;
      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { calendarFilters: filters },
      });
    }),
});
