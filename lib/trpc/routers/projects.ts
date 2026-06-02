import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";
import { requireWorkspaceMember, requireWorkspaceOwner } from "@/lib/trpc/guards";
import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const ProjectInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  image: z.string().nullable().optional(),
});

async function isWorkspaceOwner(prisma: PrismaClient, userId: string, workspaceId: string) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
  return ws?.ownerId === userId;
}

async function canAccessProject(
  prisma: PrismaClient,
  userId: string,
  workspaceId: string,
  projectId: string,
): Promise<void> {
  await requireWorkspaceMember(prisma, userId, workspaceId);
  if (await isWorkspaceOwner(prisma, userId, workspaceId)) return;
  const pm = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!pm) throw new TRPCError({ code: "FORBIDDEN" });
}

export const projectsRouter = router({
  // All projects across every workspace the user belongs to
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const memberships = await ctx.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true, workspace: { select: { ownerId: true } } },
    });

    const workspaceIds = memberships.map((m) => m.workspaceId);
    const ownerSet = new Set(
      memberships.filter((m) => m.workspace.ownerId === userId).map((m) => m.workspaceId)
    );

    const projects = await ctx.prisma.project.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { workspaceId: { in: [...ownerSet] } },
          { workspaceId: { in: workspaceIds }, members: { some: { userId } } },
        ],
      },
      select: { id: true, name: true, workspaceId: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return projects.map((p) => ({ ...p, isOwned: ownerSet.has(p.workspaceId) }));
  }),

  listAllFull: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const memberships = await ctx.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true, workspace: { select: { ownerId: true } } },
    });

    const workspaceIds = memberships.map((m) => m.workspaceId);
    const ownerSet = new Set(
      memberships.filter((m) => m.workspace.ownerId === userId).map((m) => m.workspaceId)
    );

    const projects = await ctx.prisma.project.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { workspaceId: { in: [...ownerSet] } },
          { workspaceId: { in: workspaceIds }, members: { some: { userId } } },
        ],
      },
      include: { _count: { select: { tasks: true } }, sprints: { where: { status: "ACTIVE" }, take: 1 } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return projects.map((p) => ({ ...p, isOwned: ownerSet.has(p.workspaceId) }));
  }),

  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireWorkspaceMember(ctx.prisma, ctx.session.user.id, input.workspaceId);
      const owner = await isWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);

      const where = owner
        ? { workspaceId: input.workspaceId }
        : { workspaceId: input.workspaceId, members: { some: { userId: ctx.session.user.id } } };

      return ctx.prisma.project.findMany({
        where,
        include: {
          _count: { select: { tasks: true } },
          sprints: { where: { status: "ACTIVE" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string(), workspaceId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const workspaceId = input.workspaceId ?? (
        await ctx.prisma.project.findUnique({ where: { id: input.id }, select: { workspaceId: true } })
      )?.workspaceId;
      if (!workspaceId) throw new TRPCError({ code: "NOT_FOUND" });

      await requireWorkspaceMember(ctx.prisma, ctx.session.user.id, workspaceId);
      const owner = await isWorkspaceOwner(ctx.prisma, ctx.session.user.id, workspaceId);

      let pm = null;
      if (!owner) {
        pm = await ctx.prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: input.id, userId: ctx.session.user.id } },
        });
        if (!pm) throw new TRPCError({ code: "FORBIDDEN" });
      }

      const isManager = owner || pm?.permission === "MANAGER";

      // VIEWER and EDITOR see all tasks — permission controls what actions they can take, not visibility
      const taskWhere = { projectId: input.id };

      const project = await ctx.prisma.project.findFirst({
        where: { id: input.id, workspaceId },
        include: {
          workspace: { select: { ownerId: true } },
          sprints: { orderBy: { createdAt: "desc" } },
          members: { select: { userId: true, tag: true, permission: true } },
          tasks: {
            where: taskWhere,
            include: {
              assignees: {
                include: { user: { select: { id: true, name: true, image: true } } },
              },
            },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          },
        },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return { ...project, isManager };
    }),

  create: protectedProcedure
    .input(z.object({ workspaceId: z.string(), data: ProjectInput }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);

      const projectCount = await ctx.prisma.project.count({
        where: { workspaceId: input.workspaceId },
      });
      if (projectCount >= 5) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Project limit reached (max 5 per workspace)" });
      }

      const project = await ctx.prisma.project.create({
        data: { ...input.data, workspaceId: input.workspaceId },
      });
      // Owner auto-joins as MANAGER so they appear in the team list
      await ctx.prisma.projectMember.create({
        data: { projectId: project.id, userId: ctx.session.user.id, permission: "MANAGER" },
      });
      await ctx.prisma.activityLog.create({
        data: {
          workspaceId: input.workspaceId,
          entityType: "PROJECT",
          entityId: project.id,
          action: "CREATED",
          userId: ctx.session.user.id,
          changes: { name: project.name },
        },
      });
      return project;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), workspaceId: z.string(), data: ProjectInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      const project = await ctx.prisma.project.findUnique({ where: { id: input.id }, select: { workspaceId: true } });
      if (!project || project.workspaceId !== input.workspaceId) throw new TRPCError({ code: "FORBIDDEN" });
      return ctx.prisma.project.update({ where: { id: input.id }, data: input.data });
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string(), workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      return ctx.prisma.project.update({ where: { id: input.id }, data: { status: "ARCHIVED" } });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      return ctx.prisma.project.delete({ where: { id: input.id } });
    }),

  reorder: protectedProcedure
    .input(z.object({ workspaceId: z.string(), orderedIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      await ctx.prisma.$transaction(
        input.orderedIds.map((id, index) =>
          ctx.prisma.project.update({ where: { id }, data: { order: index } })
        )
      );
      return { success: true };
    }),

  // ─── Project-level membership ─────────────────────────────────────────────

  members: protectedProcedure
    .input(z.object({ projectId: z.string(), workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await canAccessProject(ctx.prisma, ctx.session.user.id, input.workspaceId, input.projectId);
      return ctx.prisma.projectMember.findMany({
        where: { projectId: input.projectId },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { joinedAt: "asc" },
      });
    }),

  updateMemberPermission: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      workspaceId: z.string(),
      userId: z.string(),
      permission: z.enum(["VIEWER", "EDITOR", "MANAGER"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      return ctx.prisma.projectMember.update({
        where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
        data: { permission: input.permission },
      });
    }),

  updateMemberTag: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      workspaceId: z.string(),
      userId: z.string(),
      tag: z.string().max(30).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      return ctx.prisma.projectMember.update({
        where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
        data: { tag: input.tag },
      });
    }),

  addMember: protectedProcedure
    .input(z.object({ projectId: z.string(), workspaceId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      // target user must be in workspace
      await requireWorkspaceMember(ctx.prisma, input.userId, input.workspaceId);
      return ctx.prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
        create: { projectId: input.projectId, userId: input.userId },
        update: {},
      });
    }),

  removeMember: protectedProcedure
    .input(z.object({ projectId: z.string(), workspaceId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      await ctx.prisma.projectMember.deleteMany({
        where: { projectId: input.projectId, userId: input.userId },
      });
    }),

  // ─── Join Code ───────────────────────────────────────────────────────────────

  generateCode: protectedProcedure
    .input(z.object({ projectId: z.string(), workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      const code = makeJoinCode();
      return ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { joinCode: code },
        select: { joinCode: true },
      });
    }),

  joinByCode: protectedProcedure
    .input(z.object({ code: z.string().trim().toUpperCase() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { joinCode: input.code },
        select: { id: true, workspaceId: true, name: true },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบ project สำหรับรหัสนี้" });

      const existing = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: ctx.session.user.id } },
      });
      if (!existing) {
        await ctx.prisma.workspaceMember.create({
          data: { workspaceId: project.workspaceId, userId: ctx.session.user.id },
        });
      }

      await ctx.prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: ctx.session.user.id } },
        create: { projectId: project.id, userId: ctx.session.user.id },
        update: {},
      });

      return { projectId: project.id, projectName: project.name };
    }),
});

function makeJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no confusables (0,O,I,1)
  const bytes = randomBytes(8);
  const seg = (start: number, len: number) =>
    Array.from(bytes.slice(start, start + len), (b) => chars[b % chars.length]).join("");
  return `${seg(0, 4)}-${seg(4, 4)}`;
}
