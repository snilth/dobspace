import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";
import { requireProjectPermission } from "@/lib/trpc/guards";
import { anthropic } from "@/lib/ai/client";

const SprintInput = z.object({
  name: z.string().min(1).max(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

async function getSprintWithProject(prisma: Parameters<typeof requireProjectPermission>[0], sprintId: string) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { id: true, projectId: true, status: true },
  });
  if (!sprint) throw new TRPCError({ code: "NOT_FOUND", message: "Sprint not found" });
  return sprint;
}

async function generateSprintSummary(
  prisma: Parameters<typeof requireProjectPermission>[0],
  sprintId: string,
): Promise<string> {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: {
      name: true,
      startDate: true,
      endDate: true,
      tasks: {
        select: {
          title: true,
          status: true,
          priority: true,
          assignees: { take: 1, include: { user: { select: { name: true } } } },
        },
      },
    },
  });
  if (!sprint) throw new TRPCError({ code: "NOT_FOUND" });

  const taskLines = sprint.tasks.map((t) => {
    const assignee = t.assignees[0]?.user.name ?? "Unassigned";
    return `- [${t.status}] ${t.title} (${t.priority}) — ${assignee}`;
  }).join("\n");

  const done = sprint.tasks.filter((t) => t.status === "DONE").length;
  const total = sprint.tasks.length;

  const message = await anthropic.messages.create({
    model: process.env.AI_MODEL ?? "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Summarize this sprint for a developer team. Be concise (3-5 sentences). Focus on what was accomplished, what wasn't, and any notable patterns.

Sprint: ${sprint.name}
Period: ${sprint.startDate.toISOString().slice(0, 10)} → ${sprint.endDate.toISOString().slice(0, 10)}
Completion: ${done}/${total} tasks done

Tasks:
${taskLines || "No tasks"}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return content.text;
}

export const sprintRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, input.projectId, "VIEWER");
      return ctx.prisma.sprint.findMany({
        where: { projectId: input.projectId },
        include: {
          _count: { select: { tasks: true } },
          tasks: { select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ sprintId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sprint = await ctx.prisma.sprint.findUnique({
        where: { id: input.sprintId },
        include: {
          tasks: {
            include: {
              assignees: { include: { user: { select: { id: true, name: true, image: true } } } },
            },
            orderBy: { order: "asc" },
          },
        },
      });
      if (!sprint) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, sprint.projectId, "VIEWER");
      return sprint;
    }),

  create: protectedProcedure
    .input(z.object({ projectId: z.string(), sprint: SprintInput }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, input.projectId, "MANAGER");
      return ctx.prisma.sprint.create({
        data: {
          projectId: input.projectId,
          name: input.sprint.name,
          startDate: new Date(input.sprint.startDate),
          endDate: new Date(input.sprint.endDate),
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ sprintId: z.string(), name: z.string().min(1).max(100).optional(), startDate: z.string().datetime().optional(), endDate: z.string().datetime().optional() }))
    .mutation(async ({ ctx, input }) => {
      const sprint = await getSprintWithProject(ctx.prisma, input.sprintId);
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, sprint.projectId, "MANAGER");
      const { sprintId, ...data } = input;
      return ctx.prisma.sprint.update({
        where: { id: sprintId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.startDate && { startDate: new Date(data.startDate) }),
          ...(data.endDate && { endDate: new Date(data.endDate) }),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ sprintId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sprint = await getSprintWithProject(ctx.prisma, input.sprintId);
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, sprint.projectId, "MANAGER");
      // Unassign tasks before deleting
      await ctx.prisma.task.updateMany({
        where: { sprintId: input.sprintId },
        data: { sprintId: null },
      });
      await ctx.prisma.sprint.delete({ where: { id: input.sprintId } });
    }),

  activate: protectedProcedure
    .input(z.object({ sprintId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sprint = await getSprintWithProject(ctx.prisma, input.sprintId);
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, sprint.projectId, "MANAGER");
      if (sprint.status !== "PLANNING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only PLANNING sprints can be activated" });
      }
      const existing = await ctx.prisma.sprint.findFirst({
        where: { projectId: sprint.projectId, status: "ACTIVE" },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "There is already an active sprint in this project" });
      }
      return ctx.prisma.sprint.update({
        where: { id: input.sprintId },
        data: { status: "ACTIVE" },
      });
    }),

  complete: protectedProcedure
    .input(z.object({
      sprintId: z.string(),
      carryoverTaskIds: z.array(z.string()).optional(),
      targetSprintId: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sprint = await getSprintWithProject(ctx.prisma, input.sprintId);
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, sprint.projectId, "MANAGER");
      if (sprint.status !== "ACTIVE") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only ACTIVE sprints can be completed" });
      }

      // Carry-over: move selected incomplete tasks to target sprint (or unassign)
      if (input.carryoverTaskIds?.length) {
        if (input.targetSprintId) {
          const target = await ctx.prisma.sprint.findUnique({
            where: { id: input.targetSprintId },
            select: { projectId: true, status: true },
          });
          if (!target || target.projectId !== sprint.projectId) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Target sprint not found in this project" });
          }
          if (target.status === "COMPLETED") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot carry over to a completed sprint" });
          }
          await ctx.prisma.task.updateMany({
            where: { id: { in: input.carryoverTaskIds }, sprintId: input.sprintId },
            data: { sprintId: input.targetSprintId },
          });
        } else {
          // Unassign — move to backlog
          await ctx.prisma.task.updateMany({
            where: { id: { in: input.carryoverTaskIds }, sprintId: input.sprintId },
            data: { sprintId: null },
          });
        }
      }

      const summary = await generateSprintSummary(ctx.prisma, input.sprintId);
      return ctx.prisma.sprint.update({
        where: { id: input.sprintId },
        data: { status: "COMPLETED", summary, summaryAt: new Date() },
      });
    }),

  generateSummary: protectedProcedure
    .input(z.object({ sprintId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sprint = await getSprintWithProject(ctx.prisma, input.sprintId);
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, sprint.projectId, "MANAGER");
      const summary = await generateSprintSummary(ctx.prisma, input.sprintId);
      return ctx.prisma.sprint.update({
        where: { id: input.sprintId },
        data: { summary, summaryAt: new Date() },
      });
    }),

  assignTasks: protectedProcedure
    .input(z.object({ sprintId: z.string(), taskIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const sprint = await getSprintWithProject(ctx.prisma, input.sprintId);
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, sprint.projectId, "EDITOR");

      const tasks = await ctx.prisma.task.findMany({
        where: { id: { in: input.taskIds }, projectId: sprint.projectId },
        select: { id: true, title: true, dueDate: true },
      });

      const missing = tasks.filter((t) => !t.dueDate).map((t) => t.title);
      if (missing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Tasks must have a due date before being added to a sprint: ${missing.join(", ")}`,
        });
      }

      await ctx.prisma.task.updateMany({
        where: { id: { in: input.taskIds }, projectId: sprint.projectId },
        data: { sprintId: input.sprintId },
      });
    }),

  removeTasks: protectedProcedure
    .input(z.object({ sprintId: z.string(), taskIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const sprint = await getSprintWithProject(ctx.prisma, input.sprintId);
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, sprint.projectId, "EDITOR");
      await ctx.prisma.task.updateMany({
        where: { id: { in: input.taskIds }, sprintId: input.sprintId },
        data: { sprintId: null },
      });
    }),

  burndown: protectedProcedure
    .input(z.object({ sprintId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sprint = await ctx.prisma.sprint.findUnique({
        where: { id: input.sprintId },
        select: {
          startDate: true,
          endDate: true,
          projectId: true,
          tasks: { select: { status: true, updatedAt: true } },
        },
      });
      if (!sprint) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, sprint.projectId, "VIEWER");

      const start = new Date(sprint.startDate);
      const end = new Date(sprint.endDate);
      const today = new Date();
      const chartEnd = today < end ? today : end;

      const days: { date: string; remaining: number; ideal: number }[] = [];
      const total = sprint.tasks.length;
      const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));

      let d = new Date(start);
      let dayIndex = 0;
      while (d <= chartEnd) {
        const dateStr = d.toISOString().slice(0, 10);
        const doneByDay = sprint.tasks.filter((t) => {
          if (t.status !== "DONE") return false;
          return new Date(t.updatedAt) <= new Date(dateStr + "T23:59:59Z");
        }).length;
        const ideal = Math.max(0, total - Math.round((total / totalDays) * dayIndex));
        days.push({ date: dateStr, remaining: total - doneByDay, ideal });
        d = new Date(d.getTime() + 86400000);
        dayIndex++;
      }

      return { days, total };
    }),

  listAll: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const projectMemberships = await ctx.prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      });
      const memberProjectIds = new Set(projectMemberships.map((m) => m.projectId));

      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
        select: { ownerId: true },
      });
      const isOwner = workspace?.ownerId === userId;

      const projects = await ctx.prisma.project.findMany({
        where: {
          workspaceId: input.workspaceId,
          status: "ACTIVE",
          ...(isOwner ? {} : { id: { in: [...memberProjectIds] } }),
        },
        select: { id: true, name: true },
      });

      const projectIds = projects.map((p) => p.id);
      const projectMap = new Map(projects.map((p) => [p.id, p.name]));

      const sprints = await ctx.prisma.sprint.findMany({
        where: { projectId: { in: projectIds } },
        include: {
          _count: { select: { tasks: true } },
          tasks: {
            select: {
              status: true,
              dueDate: true,
              assignees: { select: { userId: true }, take: 1 },
            },
          },
        },
        orderBy: [{ status: "asc" }, { startDate: "desc" }],
      });

      return sprints.map((s) => ({
        ...s,
        projectName: projectMap.get(s.projectId) ?? "",
      }));
    }),
});
