import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";
import { requireWorkspaceMember, requireWorkspaceOwner } from "@/lib/trpc/guards";

export const workspaceRouter = router({
  // ─── Workspace CRUD ────────────────────────────────────────────────────────

  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    let member = await ctx.prisma.workspaceMember.findFirst({
      where: { userId: ctx.session.user.id },
      include: {
        workspace: { include: { _count: { select: { members: true, projects: true } } } },
      },
      orderBy: { joinedAt: "asc" },
    });

    // Auto-heal: user exists but no workspace (e.g. registration hook failed)
    if (!member) {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { name: true },
      });
      await ctx.prisma.workspace.create({
        data: {
          name: `${user?.name ?? "My"}'s Workspace`,
          ownerId: ctx.session.user.id,
          members: { create: { userId: ctx.session.user.id } },
        },
      });
      member = await ctx.prisma.workspaceMember.findFirstOrThrow({
        where: { userId: ctx.session.user.id },
        include: {
          workspace: { include: { _count: { select: { members: true, projects: true } } } },
        },
        orderBy: { joinedAt: "asc" },
      });
    }

    const isOwner = member.workspace.ownerId === ctx.session.user.id;
    return { workspace: member.workspace, isOwner };
  }),

  myWorkspaces: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.workspaceMember.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        workspace: {
          include: { _count: { select: { members: true, projects: true } } },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    return memberships.map((m) => ({
      ...m,
      isOwner: m.workspace.ownerId === ctx.session.user.id,
    }));
  }),

  get: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireWorkspaceMember(ctx.prisma, ctx.session.user.id, input.workspaceId);
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
        include: { _count: { select: { members: true, projects: true } } },
      });
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
      const isOwner = workspace.ownerId === ctx.session.user.id;
      return { workspace, isOwner };
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.create({
        data: { name: input.name, ownerId: ctx.session.user.id },
      });
      await ctx.prisma.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: ctx.session.user.id },
      });
      return workspace;
    }),

  update: protectedProcedure
    .input(z.object({ workspaceId: z.string(), name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      return ctx.prisma.workspace.update({
        where: { id: input.workspaceId },
        data: { name: input.name },
      });
    }),

  // ─── Members ───────────────────────────────────────────────────────────────

  members: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireWorkspaceMember(ctx.prisma, ctx.session.user.id, input.workspaceId);
      return ctx.prisma.workspaceMember.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          jobRole: true,
        },
        orderBy: { joinedAt: "asc" },
      });
    }),

  membersWithProjects: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireWorkspaceMember(ctx.prisma, ctx.session.user.id, input.workspaceId);

      const [wsMembers, projectMembers] = await Promise.all([
        ctx.prisma.workspaceMember.findMany({
          where: { workspaceId: input.workspaceId },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        }),
        ctx.prisma.projectMember.findMany({
          where: { project: { workspaceId: input.workspaceId } },
          select: { userId: true, permission: true, tag: true, project: { select: { id: true, name: true } } },
        }),
      ]);

      const projectsByUser = new Map<string, { id: string; name: string; permission: string; tag: string | null }[]>();
      for (const pm of projectMembers) {
        const list = projectsByUser.get(pm.userId) ?? [];
        list.push({ id: pm.project.id, name: pm.project.name, permission: pm.permission, tag: pm.tag ?? null });
        projectsByUser.set(pm.userId, list);
      }

      return wsMembers.map((m) => ({
        ...m,
        projects: projectsByUser.get(m.userId) ?? [],
      }));
    }),

  removeMember: protectedProcedure
    .input(z.object({ workspaceId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove yourself" });
      }

      await ctx.prisma.workspaceMember.delete({
        where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
      });
      await ctx.prisma.activityLog.create({
        data: {
          workspaceId: input.workspaceId,
          entityType: "MEMBER",
          entityId: input.userId,
          action: "MEMBER_REMOVED",
          userId: ctx.session.user.id,
        },
      });
      return { success: true };
    }),

  // ─── Job Roles ─────────────────────────────────────────────────────────────

  listJobRoles: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireWorkspaceMember(ctx.prisma, ctx.session.user.id, input.workspaceId);
      return ctx.prisma.jobRole.findMany({
        where: { workspaceId: input.workspaceId },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "asc" },
      });
    }),

  createJobRole: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      name: z.string().min(1).max(50),
      description: z.string().max(200).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      return ctx.prisma.jobRole.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description,
          color: input.color,
          createdBy: ctx.session.user.id,
        },
      });
    }),

  updateJobRole: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      id: z.string(),
      name: z.string().min(1).max(50).optional(),
      description: z.string().max(200).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      const { workspaceId, id, ...data } = input;
      return ctx.prisma.jobRole.update({
        where: { id, workspaceId },
        data,
      });
    }),

  deleteJobRole: protectedProcedure
    .input(z.object({ workspaceId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      await ctx.prisma.workspaceMember.updateMany({
        where: { workspaceId: input.workspaceId, jobRoleId: input.id },
        data: { jobRoleId: null },
      });
      await ctx.prisma.jobRole.delete({ where: { id: input.id, workspaceId: input.workspaceId } });
      return { success: true };
    }),

  assignJobRole: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      userId: z.string(),
      jobRoleId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkspaceOwner(ctx.prisma, ctx.session.user.id, input.workspaceId);
      const target = await ctx.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
        select: { jobRoleId: true, jobRole: { select: { name: true } } },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });

      const updated = await ctx.prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
        data: { jobRoleId: input.jobRoleId },
        include: { jobRole: true },
      });
      await ctx.prisma.activityLog.create({
        data: {
          workspaceId: input.workspaceId,
          entityType: "MEMBER",
          entityId: input.userId,
          action: "ROLE_ASSIGNED",
          userId: ctx.session.user.id,
          changes: { jobRoleId: { before: target.jobRoleId, after: input.jobRoleId } },
        },
      });
      return updated;
    }),
});
