import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";
import { TaskStatus, Priority, Prisma, PrismaClient } from "@prisma/client";
import { requireProjectPermission } from "@/lib/trpc/guards";
import { emitToProject, emitToUser } from "@/lib/socket/server";

function extractMentionedFirstNames(text: string): string[] {
  const matches = [...(text ?? "").matchAll(/@([^\s@]+)/g)];
  return [...new Set(matches.map(m => m[1].toLowerCase()))];
}

async function notifyMentioned(
  prisma: PrismaClient,
  texts: string[],
  taskId: string,
  taskTitle: string,
  projectId: string,
  workspaceId: string,
  actorId: string,
  actorName: string,
  projectName: string | null,
) {
  const names = texts.flatMap(extractMentionedFirstNames);
  if (!names.length) return;

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true } } },
  });

  for (const { user } of members) {
    if (user.id === actorId) continue;
    const firstName = user.name.split(" ")[0].toLowerCase();
    if (!names.includes(firstName)) continue;
    const events = await getEventPrefs(prisma, user.id);
    if (events.mentioned === false) continue;

    // Dedup: skip if already mentioned in this task within the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const alreadyMentioned = await prisma.notification.findFirst({
      where: { userId: user.id, taskId, type: "TASK_COMMENTED", dismissed: false, createdAt: { gte: oneHourAgo } },
    });
    if (alreadyMentioned) continue;

    const notif = await prisma.notification.create({
      data: {
        userId: user.id, taskId, type: "TASK_COMMENTED",
        message: `${actorName} mentioned you in a note`,
        metadata: { actor: actorName, taskTitle, project: projectName },
      },
    });
    emitToUser(user.id, "notification:new", { id: notif.id, type: notif.type, message: notif.message, taskId: notif.taskId, createdAt: notif.createdAt });
  }
}

const DEFAULT_EVENT_TYPES_MAP: Record<string, boolean> = {
  assigned: true, status_changed: true, priority_changed: true,
  due_date_changed: true, commented: true, mentioned: true,
};

async function getEventPrefs(prisma: PrismaClient, userId: string): Promise<Record<string, boolean>> {
  const pref = await prisma.notificationPreference.findFirst({
    where: { userId },
    select: { eventTypes: true },
  });
  return { ...DEFAULT_EVENT_TYPES_MAP, ...((pref?.eventTypes ?? {}) as object) } as Record<string, boolean>;
}

async function batchEventPrefs(prisma: PrismaClient, userIds: string[]): Promise<Map<string, Record<string, boolean>>> {
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, eventTypes: true },
  });
  const map = new Map<string, Record<string, boolean>>();
  for (const p of prefs) map.set(p.userId, { ...DEFAULT_EVENT_TYPES_MAP, ...((p.eventTypes ?? {}) as object) } as Record<string, boolean>);
  // Users without a record get all defaults (true)
  for (const userId of userIds) {
    if (!map.has(userId)) map.set(userId, { ...DEFAULT_EVENT_TYPES_MAP });
  }
  return map;
}

const TaskInput = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  note: z.string().max(2000).optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeIds: z.array(z.string()).max(20).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  sprintId: z.string().optional().nullable(),
});

export const tasksRouter = router({
  create: protectedProcedure
    .input(z.object({ projectId: z.string(), task: TaskInput }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      await requireProjectPermission(ctx.prisma, ctx.session.user.id, input.projectId, "EDITOR");

      const count = await ctx.prisma.task.count({
        where: { projectId: input.projectId, status: input.task.status ?? "BACKLOG" },
      });

      const { assigneeIds, dueDate, ...taskData } = input.task;

      const task = await ctx.prisma.task.create({
        data: {
          projectId: input.projectId,
          title: taskData.title,
          description: taskData.description,
          note: taskData.note ?? null,
          status: taskData.status ?? "BACKLOG",
          priority: taskData.priority ?? "MEDIUM",
          dueDate: dueDate ? new Date(dueDate) : undefined,
          tags: taskData.tags ?? [],
          sprintId: taskData.sprintId,
          order: count,
        },
      });

      if (assigneeIds?.length) {
        const memberJobRoles = await ctx.prisma.workspaceMember.findMany({
          where: { workspaceId: project.workspaceId, userId: { in: assigneeIds } },
          include: { jobRole: true },
        });
        // Reject if any assignee is not a workspace member
        if (memberJobRoles.length !== assigneeIds.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "One or more assignee IDs are invalid" });
        }
        const roleMap = new Map(memberJobRoles.map((m) => [m.userId, m.jobRole?.name ?? null]));
        await ctx.prisma.taskAssignee.createMany({
          data: assigneeIds.map((userId) => ({
            taskId: task.id, userId,
            jobRole: roleMap.get(userId) ?? null,
            assignedBy: ctx.session.user.id,
          })),
          skipDuplicates: true,
        });
      }

      // Notify assignees on task creation (skip self-assign, check preference)
      if (assigneeIds?.length) {
        const notifyIds = assigneeIds.filter((id) => id !== ctx.session.user.id);
        if (notifyIds.length) {
          const [assigner, projectRow, prefMap] = await Promise.all([
            ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } }),
            ctx.prisma.project.findUnique({ where: { id: input.projectId }, select: { name: true } }),
            batchEventPrefs(ctx.prisma, notifyIds),
          ]);
          for (const userId of notifyIds) {
            const events = prefMap.get(userId) ?? {};
            if (events.assigned === false) continue;
            const notif = await ctx.prisma.notification.create({
              data: {
                userId, taskId: task.id, type: "TASK_ASSIGNED",
                message: `${assigner?.name ?? "Someone"} assigned a task to you`,
                metadata: { actor: assigner?.name ?? "Someone", taskTitle: task.title, project: projectRow?.name ?? null },
              },
            });
            emitToUser(userId, "notification:new", { id: notif.id, type: notif.type, message: notif.message, taskId: notif.taskId, createdAt: notif.createdAt });
          }
        }
      }

      await ctx.prisma.activityLog.create({
        data: {
          workspaceId: project.workspaceId,
          entityType: "TASK", entityId: task.id, action: "CREATED",
          userId: ctx.session.user.id,
          changes: { title: task.title, status: task.status, priority: task.priority },
        },
      });

      const newTask = await ctx.prisma.task.findUniqueOrThrow({
        where: { id: task.id },
        include: { assignees: { include: { user: { select: { id: true, name: true, image: true } } } } },
      });

      emitToProject(input.projectId, "task:created", {
        taskId: newTask.id,
        title: newTask.title,
        status: newTask.status,
        priority: newTask.priority,
        tags: newTask.tags,
        assignee: newTask.assignees[0]?.user ?? null,
        dueDate: newTask.dueDate,
        changedBy: ctx.session.user.id,
      });

      // Detect @mentions in note/description
      const assigner2 = await ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } });
      const projectName2 = (await ctx.prisma.project.findUnique({ where: { id: input.projectId }, select: { name: true } }))?.name ?? null;
      await notifyMentioned(ctx.prisma, [taskData.description ?? "", taskData.note ?? ""], task.id, taskData.title, input.projectId, project.workspaceId, ctx.session.user.id, assigner2?.name ?? "Someone", projectName2);

      return newTask;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: TaskInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: {
          title: true, projectId: true, status: true, priority: true, dueDate: true,
          project: { select: { workspaceId: true } },
          assignees: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, task.projectId, "EDITOR");

      const { assigneeIds, dueDate, ...rest } = input.data;
      const updated = await ctx.prisma.task.update({
        where: { id: input.id },
        data: { ...rest, ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}) },
        include: { assignees: { include: { user: { select: { id: true, name: true, image: true } } } } },
      });

      // ── Compute actual dueDate change ──────────────────────────────────────
      const dueDateActuallyChanged = dueDate !== undefined && (
        (dueDate === null && task.dueDate !== null) ||
        (dueDate !== null && (!task.dueDate || new Date(dueDate).getTime() !== task.dueDate.getTime()))
      );

      // ── Activity log ────────────────────────────────────────────────────────
      const activityChanges: Record<string, { before: unknown; after: unknown }> = {};
      if (rest.status && task.status !== rest.status) activityChanges.status = { before: task.status, after: rest.status };
      if (rest.priority && task.priority !== rest.priority) activityChanges.priority = { before: task.priority, after: rest.priority };
      if (dueDateActuallyChanged) activityChanges.dueDate = { before: task.dueDate, after: dueDate };

      if (Object.keys(activityChanges).length) {
        await ctx.prisma.activityLog.create({
          data: {
            workspaceId: task.project.workspaceId,
            entityType: "TASK", entityId: input.id, action: "UPDATED",
            userId: ctx.session.user.id,
            changes: activityChanges as unknown as Prisma.InputJsonValue,
          },
        });
      }

      // ── Bundled notification to assignees (not the editor) ──────────────────
      const STATUS_LABEL: Record<string, string> = { BACKLOG: "Backlog", IN_PROGRESS: "In Progress", REVIEW: "In Review", DONE: "Done" };
      const PRIORITY_LABEL: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
      const metaChanges: Record<string, string> = {};
      if (rest.status && task.status !== rest.status) metaChanges.status = STATUS_LABEL[rest.status] ?? rest.status;
      if (rest.priority && task.priority !== rest.priority) metaChanges.priority = PRIORITY_LABEL[rest.priority] ?? rest.priority;
      if (dueDateActuallyChanged) metaChanges.dueDate = dueDate ? new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Removed";
      if (rest.title && rest.title !== task.title) metaChanges.title = rest.title;

      if (Object.keys(metaChanges).length > 0) {
        const editor = await ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } });
        const projectName = (await ctx.prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } }))?.name ?? null;
        const notifyUserIds = task.assignees.filter(a => a.user.id !== ctx.session.user.id).map(a => a.user.id);

        const prefMap = await batchEventPrefs(ctx.prisma, notifyUserIds);

        for (const userId of notifyUserIds) {
          const events = prefMap.get(userId) ?? {};

          // Filter changes to only what this user wants to receive
          const allowedChanges: Record<string, string> = {};
          if (metaChanges.status   && events.status_changed   !== false) allowedChanges.status   = metaChanges.status;
          if (metaChanges.priority && events.priority_changed !== false) allowedChanges.priority = metaChanges.priority;
          if (metaChanges.dueDate  && events.due_date_changed !== false) allowedChanges.dueDate  = metaChanges.dueDate;
          if (metaChanges.title) allowedChanges.title = metaChanges.title;

          // Only notify if at least one allowed change exists
          if (Object.keys(allowedChanges).length === 0) continue;

          const notif = await ctx.prisma.notification.create({
            data: {
              userId, taskId: input.id, type: "TASK_UPDATED",
              message: `${editor?.name ?? "Someone"} updated a task`,
              metadata: { actor: editor?.name ?? "Someone", taskTitle: updated.title, project: projectName, changes: allowedChanges },
            },
          });
          emitToUser(userId, "notification:new", { id: notif.id, type: notif.type, message: notif.message, taskId: notif.taskId, createdAt: notif.createdAt });
        }
      }

      emitToProject(task.projectId, "task:updated", {
        taskId: updated.id,
        title: updated.title,
        priority: updated.priority,
        status: updated.status,
        tags: updated.tags,
        dueDate: updated.dueDate,
        assignee: updated.assignees[0]?.user ?? null,
        changedBy: ctx.session.user.id,
      });

      // Detect @mentions in updated note (only if note field was included in update)
      if (rest.note != null) {
        const editorInfo = await ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } });
        const projName = (await ctx.prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } }))?.name ?? null;
        await notifyMentioned(ctx.prisma, [rest.note], input.id, updated.title, task.projectId, task.project.workspaceId, ctx.session.user.id, editorInfo?.name ?? "Someone", projName);
      }

      return updated;
    }),

  move: protectedProcedure
    .input(z.object({ id: z.string(), status: z.nativeEnum(TaskStatus), order: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: {
          title: true, projectId: true, status: true,
          project: { select: { workspaceId: true, name: true } },
          assignees: { select: { userId: true } },
        },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, task.projectId, "EDITOR");

      const updated = await ctx.prisma.task.update({
        where: { id: input.id },
        data: { status: input.status, order: input.order ?? 0 },
      });

      if (task.status !== input.status) {
        await ctx.prisma.activityLog.create({
          data: {
            workspaceId: task.project.workspaceId,
            entityType: "TASK", entityId: input.id, action: "MOVED",
            userId: ctx.session.user.id,
            changes: { status: { before: task.status, after: input.status } },
          },
        });

        // Notify assignees of status change
        const STATUS_LABEL: Record<string, string> = { BACKLOG: "Backlog", IN_PROGRESS: "In Progress", REVIEW: "In Review", DONE: "Done" };
        const notifyIds = task.assignees.map((a) => a.userId).filter((id) => id !== ctx.session.user.id);
        if (notifyIds.length) {
          const [mover, prefMap] = await Promise.all([
            ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } }),
            batchEventPrefs(ctx.prisma, notifyIds),
          ]);
          for (const userId of notifyIds) {
            const events = prefMap.get(userId) ?? {};
            if (events.status_changed === false) continue;
            const notif = await ctx.prisma.notification.create({
              data: {
                userId, taskId: input.id, type: "TASK_MOVED",
                message: `${mover?.name ?? "Someone"} moved a task`,
                metadata: {
                  actor: mover?.name ?? "Someone",
                  taskTitle: task.title,
                  project: task.project.name,
                  changes: { status: STATUS_LABEL[input.status] ?? input.status },
                },
              },
            });
            emitToUser(userId, "notification:new", { id: notif.id, type: notif.type, message: notif.message, taskId: notif.taskId, createdAt: notif.createdAt });
          }
        }
      }

      emitToProject(task.projectId, "task:moved", {
        taskId: updated.id,
        status: updated.status,
        changedBy: ctx.session.user.id,
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: { projectId: true, project: { select: { workspaceId: true } } },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, task.projectId, "EDITOR");

      await ctx.prisma.activityLog.create({
        data: {
          workspaceId: task.project.workspaceId,
          entityType: "TASK", entityId: input.id, action: "DELETED",
          userId: ctx.session.user.id,
        },
      });

      const deleted = await ctx.prisma.task.delete({ where: { id: input.id } });

      emitToProject(task.projectId, "task:deleted", {
        taskId: input.id,
        changedBy: ctx.session.user.id,
      });

      return deleted;
    }),

  addAssignee: protectedProcedure
    .input(z.object({ taskId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { title: true, projectId: true, project: { select: { workspaceId: true } } },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });

      await requireProjectPermission(ctx.prisma, ctx.session.user.id, task.projectId, "MANAGER");

      const memberInfo = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: task.project.workspaceId, userId: input.userId } },
        include: { jobRole: true },
      });
      if (!memberInfo) throw new TRPCError({ code: "NOT_FOUND", message: "User not in workspace" });

      const assignee = await ctx.prisma.taskAssignee.create({
        data: { taskId: input.taskId, userId: input.userId, jobRole: memberInfo.jobRole?.name ?? null, assignedBy: ctx.session.user.id },
        include: { user: { select: { id: true, name: true, image: true } } },
      });

      await ctx.prisma.activityLog.create({
        data: { workspaceId: task.project.workspaceId, entityType: "TASK", entityId: input.taskId, action: "ASSIGNED", userId: ctx.session.user.id, changes: { assignedUserId: input.userId } },
      });

      // Notify assignee (skip self-assign, check preference)
      if (input.userId !== ctx.session.user.id) {
        const events = await getEventPrefs(ctx.prisma, input.userId);
        if (events.assigned !== false) {
        const [assigner, project] = await Promise.all([
          ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } }),
          ctx.prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } }),
        ]);
        const notif = await ctx.prisma.notification.create({
          data: {
            userId: input.userId,
            taskId: input.taskId,
            type: "TASK_ASSIGNED",
            message: `${assigner?.name ?? "Someone"} assigned a task to you`,
            metadata: { actor: assigner?.name ?? "Someone", taskTitle: task.title, project: project?.name ?? null },
          },
        });
        emitToUser(input.userId, "notification:new", {
          id: notif.id,
          type: notif.type,
          message: notif.message,
          taskId: notif.taskId,
          createdAt: notif.createdAt,
        });
        } // end events.assigned check
      }

      return assignee;
    }),

  removeAssignee: protectedProcedure
    .input(z.object({ taskId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { title: true, projectId: true, project: { select: { workspaceId: true } } },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, task.projectId, "MANAGER");

      await ctx.prisma.taskAssignee.delete({
        where: { taskId_userId: { taskId: input.taskId, userId: input.userId } },
      });

      await ctx.prisma.activityLog.create({
        data: { workspaceId: task.project.workspaceId, entityType: "TASK", entityId: input.taskId, action: "UNASSIGNED", userId: ctx.session.user.id, changes: { removedUserId: input.userId } },
      });

      const remaining = await ctx.prisma.taskAssignee.findFirst({
        where: { taskId: input.taskId },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
      emitToProject(task.projectId, "task:updated", {
        taskId: input.taskId,
        assignee: remaining?.user ?? null,
        changedBy: ctx.session.user.id,
      });

      // Notify the removed assignee (skip self-remove)
      if (input.userId !== ctx.session.user.id) {
        const [remover, project] = await Promise.all([
          ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } }),
          ctx.prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } }),
        ]);
        const notif = await ctx.prisma.notification.create({
          data: {
            userId: input.userId,
            taskId: input.taskId,
            type: "TASK_ASSIGNED",
            message: `${remover?.name ?? "ไม่ทราบชื่อ"} ยกเลิกการมอบหมาย "${task.title}" ใน ${project?.name ?? "project"}`,
          },
        });
        emitToUser(input.userId, "notification:new", {
          id: notif.id, type: notif.type, message: notif.message,
          taskId: notif.taskId, createdAt: notif.createdAt,
        });
      }

      return { success: true };
    }),

  // ─── Workflow actions ─────────────────────────────────────────────────────

  /** EDITOR submits their IN_PROGRESS task → REVIEW */
  submit: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: { title: true, projectId: true, status: true, project: { select: { workspaceId: true } } },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.status !== "IN_PROGRESS") throw new TRPCError({ code: "BAD_REQUEST", message: "ต้องอยู่ในสถานะ กำลังทำ เท่านั้น" });
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, task.projectId, "EDITOR");

      // Only the assignee or a project MANAGER (incl. workspace owner via requireProjectPermission bypass) can submit
      const isAssignee = await ctx.prisma.taskAssignee.findUnique({
        where: { taskId_userId: { taskId: input.id, userId: ctx.session.user.id } },
      });
      const pm = await ctx.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: task.projectId, userId: ctx.session.user.id } },
      });
      const isWsOwner = await ctx.prisma.workspace.findUnique({
        where: { id: task.project.workspaceId },
        select: { ownerId: true },
      }).then((ws) => ws?.ownerId === ctx.session.user.id);
      if (!isAssignee && !isWsOwner && pm?.permission !== "MANAGER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "เฉพาะผู้รับมอบหมายเท่านั้น" });
      }

      const updated = await ctx.prisma.task.update({
        where: { id: input.id },
        data: { status: "REVIEW" },
      });
      await ctx.prisma.activityLog.create({
        data: { workspaceId: task.project.workspaceId, entityType: "TASK", entityId: input.id, action: "MOVED", userId: ctx.session.user.id, changes: { status: { before: "IN_PROGRESS", after: "REVIEW" } } },
      });
      emitToProject(task.projectId, "task:moved", { taskId: input.id, status: "REVIEW", changedBy: ctx.session.user.id });
      return updated;
    }),

  /** MANAGER approves REVIEW task → DONE */
  approve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: { title: true, projectId: true, status: true, project: { select: { workspaceId: true } }, assignees: { select: { userId: true } } },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.status !== "REVIEW") throw new TRPCError({ code: "BAD_REQUEST", message: "ต้องอยู่ในสถานะ รอ Review" });
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, task.projectId, "MANAGER");

      const updated = await ctx.prisma.task.update({ where: { id: input.id }, data: { status: "DONE" } });
      await ctx.prisma.activityLog.create({
        data: { workspaceId: task.project.workspaceId, entityType: "TASK", entityId: input.id, action: "MOVED", userId: ctx.session.user.id, changes: { status: { before: "REVIEW", after: "DONE" } } },
      });
      emitToProject(task.projectId, "task:moved", { taskId: input.id, status: "DONE", changedBy: ctx.session.user.id });

      // Notify assignees
      const notifyIdsApprove = task.assignees.map((a) => a.userId).filter((id) => id !== ctx.session.user.id);
      if (notifyIdsApprove.length) {
        const [approver, project, prefMap] = await Promise.all([
          ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } }),
          ctx.prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } }),
          batchEventPrefs(ctx.prisma, notifyIdsApprove),
        ]);
        for (const userId of notifyIdsApprove) {
          const events = prefMap.get(userId) ?? {};
          if (events.status_changed === false) continue;
          const notif = await ctx.prisma.notification.create({
            data: {
              userId, taskId: input.id, type: "TASK_APPROVED",
              message: `${approver?.name ?? "Someone"} approved a task`,
              metadata: { actor: approver?.name ?? "Someone", taskTitle: task.title, project: project?.name ?? null, changes: { status: "Done ✓" } },
            },
          });
          emitToUser(userId, "notification:new", { id: notif.id, type: notif.type, message: notif.message, taskId: notif.taskId, createdAt: notif.createdAt });
        }
      }
      return updated;
    }),

  /** MANAGER rejects REVIEW task → BACKLOG + comment */
  reject: protectedProcedure
    .input(z.object({ id: z.string(), reason: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        select: { title: true, projectId: true, status: true, project: { select: { workspaceId: true } }, assignees: { select: { userId: true } } },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.status !== "REVIEW") throw new TRPCError({ code: "BAD_REQUEST", message: "ต้องอยู่ในสถานะ รอ Review" });
      await requireProjectPermission(ctx.prisma, ctx.session.user.id, task.projectId, "MANAGER");

      const updated = await ctx.prisma.task.update({ where: { id: input.id }, data: { status: "BACKLOG" } });
      await ctx.prisma.activityLog.create({
        data: { workspaceId: task.project.workspaceId, entityType: "TASK", entityId: input.id, action: "MOVED", userId: ctx.session.user.id, changes: { status: { before: "REVIEW", after: "BACKLOG" }, reason: input.reason } },
      });
      emitToProject(task.projectId, "task:moved", { taskId: input.id, status: "BACKLOG", changedBy: ctx.session.user.id });

      // Notify assignees with rejection reason
      const notifyIdsReject = task.assignees.map((a) => a.userId).filter((id) => id !== ctx.session.user.id);
      if (notifyIdsReject.length) {
        const [reviewer, project, prefMap] = await Promise.all([
          ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { name: true } }),
          ctx.prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } }),
          batchEventPrefs(ctx.prisma, notifyIdsReject),
        ]);
        for (const userId of notifyIdsReject) {
          const events = prefMap.get(userId) ?? {};
          if (events.status_changed === false) continue;
          const notif = await ctx.prisma.notification.create({
            data: {
              userId, taskId: input.id, type: "TASK_REJECTED",
              message: `${reviewer?.name ?? "Someone"} rejected a task`,
              metadata: { actor: reviewer?.name ?? "Someone", taskTitle: task.title, project: project?.name ?? null, changes: { status: "Back to Backlog" }, reason: input.reason },
            },
          });
          emitToUser(userId, "notification:new", { id: notif.id, type: notif.type, message: notif.message, taskId: notif.taskId, createdAt: notif.createdAt });
        }
      }
      return updated;
    }),

});
