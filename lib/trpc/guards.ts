import { TRPCError } from "@trpc/server";
import type { PrismaClient, ProjectPermission } from "@prisma/client";

const PERM_RANK: Record<ProjectPermission, number> = {
  VIEWER: 0,
  EDITOR: 1,
  MANAGER: 2,
};

export async function requireWorkspaceMember(
  prisma: PrismaClient,
  userId: string,
  workspaceId: string,
) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { jobRole: true },
  });
  if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
  return member;
}

export async function requireWorkspaceOwner(
  prisma: PrismaClient,
  userId: string,
  workspaceId: string,
) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
  if (workspace.ownerId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "Only the workspace owner can perform this action" });
}

/**
 * Check project-level permission.
 * Workspace owner bypasses project-level checks automatically.
 */
export async function requireProjectPermission(
  prisma: PrismaClient,
  userId: string,
  projectId: string,
  minPermission: ProjectPermission,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });

  // Workspace owner bypasses project-level restriction
  const workspace = await prisma.workspace.findUnique({
    where: { id: project.workspaceId },
    select: { ownerId: true },
  });
  if (workspace?.ownerId === userId) return;

  // Verify workspace membership
  const wsMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!wsMember) throw new TRPCError({ code: "FORBIDDEN" });

  const pm = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!pm) throw new TRPCError({ code: "FORBIDDEN" });
  if (PERM_RANK[pm.permission] < PERM_RANK[minPermission]) {
    throw new TRPCError({ code: "FORBIDDEN", message: "ไม่มีสิทธิ์ดำเนินการนี้" });
  }
}

export async function getTaskWorkspaceId(prisma: PrismaClient, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { project: { select: { workspaceId: true } } },
  });
  if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  return task.project.workspaceId;
}

/**
 * Personal layer (Course/Assignment) is owned directly by a User — no Workspace involved.
 */
export async function requireCourseOwner(prisma: PrismaClient, userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { userId: true },
  });
  if (!course) throw new TRPCError({ code: "NOT_FOUND" });
  if (course.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
}

export async function requireAssignmentOwner(prisma: PrismaClient, userId: string, assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { course: { select: { userId: true } } },
  });
  if (!assignment) throw new TRPCError({ code: "NOT_FOUND" });
  if (assignment.course.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
}
