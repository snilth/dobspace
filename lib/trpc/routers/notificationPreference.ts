import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { requireWorkspaceMember } from "@/lib/trpc/guards";

const DEFAULT_EVENT_TYPES = {
  assigned: true,
  status_changed: true,
  priority_changed: true,
  due_date_changed: true,
  commented: true,
  mentioned: true,
};

const DEFAULT_DEADLINE_APPROACHING = { enabled: true, hoursBefore: 24 };
const DEFAULT_DEADLINE_OVERDUE = { enabled: true, interval: "daily" };

const EventTypesSchema = z.object({
  assigned: z.boolean(),
  status_changed: z.boolean(),
  priority_changed: z.boolean(),
  due_date_changed: z.boolean(),
  commented: z.boolean(),
  mentioned: z.boolean(),
});

const DeadlineApproachingSchema = z.object({
  enabled: z.boolean(),
  hoursBefore: z.number().int().min(1).max(168),
});

const DeadlineOverdueSchema = z.object({
  enabled: z.boolean(),
  interval: z.enum(["once", "daily"]),
});

export const notificationPreferenceRouter = router({
  get: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireWorkspaceMember(ctx.prisma, ctx.session.user.id, input.workspaceId);

      const pref = await ctx.prisma.notificationPreference.findUnique({
        where: { userId_workspaceId: { userId: ctx.session.user.id, workspaceId: input.workspaceId } },
      });

      if (pref) return pref;

      // upsert defaults on first access
      return ctx.prisma.notificationPreference.create({
        data: {
          userId: ctx.session.user.id,
          workspaceId: input.workspaceId,
          eventTypes: DEFAULT_EVENT_TYPES,
          deadlineApproaching: DEFAULT_DEADLINE_APPROACHING,
          deadlineOverdue: DEFAULT_DEADLINE_OVERDUE,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      eventTypes: EventTypesSchema.partial().optional(),
      deadlineApproaching: DeadlineApproachingSchema.partial().optional(),
      deadlineOverdue: DeadlineOverdueSchema.partial().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceMember(ctx.prisma, ctx.session.user.id, input.workspaceId);

      const existing = await ctx.prisma.notificationPreference.findUnique({
        where: { userId_workspaceId: { userId: ctx.session.user.id, workspaceId: input.workspaceId } },
      });

      const current = {
        eventTypes: (existing?.eventTypes ?? DEFAULT_EVENT_TYPES) as typeof DEFAULT_EVENT_TYPES,
        deadlineApproaching: (existing?.deadlineApproaching ?? DEFAULT_DEADLINE_APPROACHING) as typeof DEFAULT_DEADLINE_APPROACHING,
        deadlineOverdue: (existing?.deadlineOverdue ?? DEFAULT_DEADLINE_OVERDUE) as typeof DEFAULT_DEADLINE_OVERDUE,
      };

      return ctx.prisma.notificationPreference.upsert({
        where: { userId_workspaceId: { userId: ctx.session.user.id, workspaceId: input.workspaceId } },
        create: {
          userId: ctx.session.user.id,
          workspaceId: input.workspaceId,
          eventTypes: { ...current.eventTypes, ...input.eventTypes },
          deadlineApproaching: { ...current.deadlineApproaching, ...input.deadlineApproaching },
          deadlineOverdue: { ...current.deadlineOverdue, ...input.deadlineOverdue },
        },
        update: {
          ...(input.eventTypes ? { eventTypes: { ...current.eventTypes, ...input.eventTypes } } : {}),
          ...(input.deadlineApproaching ? { deadlineApproaching: { ...current.deadlineApproaching, ...input.deadlineApproaching } } : {}),
          ...(input.deadlineOverdue ? { deadlineOverdue: { ...current.deadlineOverdue, ...input.deadlineOverdue } } : {}),
        },
      });
    }),
});
