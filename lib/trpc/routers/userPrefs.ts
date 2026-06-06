import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";

const TASK_STATUSES = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"] as const;

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

  getCalendarFilter: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { calendarFilters: true },
      });
      const filters = (user?.calendarFilters as Record<string, string[]> | null) ?? {};
      // returns the hidden statuses array, or null if never saved (caller uses default)
      return (filters[input.workspaceId] as string[] | undefined) ?? null;
    }),

  setCalendarFilter: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      hiddenStatuses: z.array(z.enum(TASK_STATUSES)),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { calendarFilters: true },
      });
      const filters = (user?.calendarFilters as Record<string, string[]> | null) ?? {};
      filters[input.workspaceId] = input.hiddenStatuses;
      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { calendarFilters: filters },
      });
    }),
});
