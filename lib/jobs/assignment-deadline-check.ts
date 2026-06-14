import { prisma } from "@/lib/db/prisma";
import { emitToUser } from "@/lib/socket/server";

const HOURS_BEFORE = 24;

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Notifies the owner of each undone Assignment whose due date is approaching or has passed.
export async function runAssignmentDeadlineCheck() {
  const now = new Date();

  // ── Due soon (within 24h) ───────────────────────────────────────────────
  const windowEnd = new Date(now.getTime() + HOURS_BEFORE * 60 * 60 * 1000);

  const approaching = await prisma.assignment.findMany({
    where: { done: false, dueDate: { gte: now, lt: windowEnd } },
    include: { course: { select: { id: true, name: true, userId: true } } },
  });

  for (const a of approaching) {
    const alreadySent = await prisma.notification.findFirst({
      where: { userId: a.course.userId, assignmentId: a.id, type: "ASSIGNMENT_DUE_APPROACHING" },
    });
    if (alreadySent) continue;

    const notif = await prisma.notification.create({
      data: {
        userId: a.course.userId,
        assignmentId: a.id,
        type: "ASSIGNMENT_DUE_APPROACHING",
        message: `"${a.title}" is due soon`,
        metadata: { assignmentTitle: a.title, courseName: a.course.name, dueDate: fmtDate(a.dueDate) },
      },
    });
    emitToUser(a.course.userId, "notification:new", {
      id: notif.id, type: notif.type, message: notif.message, taskId: null, createdAt: notif.createdAt,
    });
  }

  // ── Overdue ──────────────────────────────────────────────────────────────
  const overdue = await prisma.assignment.findMany({
    where: { done: false, dueDate: { lt: now } },
    include: { course: { select: { id: true, name: true, userId: true } } },
  });

  for (const a of overdue) {
    const alreadySent = await prisma.notification.findFirst({
      where: { userId: a.course.userId, assignmentId: a.id, type: "ASSIGNMENT_DUE_OVERDUE" },
    });
    if (alreadySent) continue;

    const notif = await prisma.notification.create({
      data: {
        userId: a.course.userId,
        assignmentId: a.id,
        type: "ASSIGNMENT_DUE_OVERDUE",
        message: `"${a.title}" is overdue`,
        metadata: { assignmentTitle: a.title, courseName: a.course.name, dueDate: fmtDate(a.dueDate) },
      },
    });
    emitToUser(a.course.userId, "notification:new", {
      id: notif.id, type: notif.type, message: notif.message, taskId: null, createdAt: notif.createdAt,
    });
  }
}
