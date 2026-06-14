import { prisma } from "@/lib/db/prisma";
import { emitToUser } from "@/lib/socket/server";

export async function runDeadlineCheck() {
  const now = new Date();

  // ── 1. Deadline approaching ────────────────────────────────────────────────
  // Get all workspace members who have deadline notifications enabled
  const prefs = await prisma.notificationPreference.findMany({
    where: { deadlineApproaching: { not: undefined } },
    select: {
      userId: true,
      workspaceId: true,
      deadlineApproaching: true,
    },
  });

  for (const pref of prefs) {
    const approaching = pref.deadlineApproaching as { enabled: boolean; hoursBefore: number } | null;
    if (!approaching?.enabled) continue;

    const windowEnd = new Date(now.getTime() + approaching.hoursBefore * 60 * 60 * 1000);
    const windowStart = new Date(now.getTime() + (approaching.hoursBefore - 1) * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: { gte: windowStart, lt: windowEnd },
        assignees: { some: { userId: pref.userId } },
      },
      select: { id: true, title: true, dueDate: true },
    });

    for (const task of tasks) {
      // Skip if already notified today
      const alreadySent = await prisma.notification.findFirst({
        where: {
          userId: pref.userId,
          taskId: task.id,
          type: "DEADLINE_APPROACHING",
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        },
      });
      if (alreadySent) continue;

      const dueStr = task.dueDate!.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const notif = await prisma.notification.create({
        data: {
          userId: pref.userId, taskId: task.id, type: "DEADLINE_APPROACHING",
          message: `Deadline approaching for a task`,
          metadata: { taskTitle: task.title, dueDate: dueStr },
        },
      });
      emitToUser(pref.userId, "notification:new", {
        id: notif.id, type: notif.type, message: notif.message, taskId: notif.taskId, createdAt: notif.createdAt,
      });
    }
  }

  // ── 2. Deadline overdue ────────────────────────────────────────────────────
  const overduPrefs = await prisma.notificationPreference.findMany({
    where: { deadlineOverdue: { not: undefined } },
    select: { userId: true, workspaceId: true, deadlineOverdue: true },
  });

  for (const pref of overduPrefs) {
    const overdue = pref.deadlineOverdue as { enabled: boolean; interval: "once" | "daily" } | null;
    if (!overdue?.enabled) continue;

    const tasks = await prisma.task.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: { lt: now },
        assignees: { some: { userId: pref.userId } },
      },
      select: { id: true, title: true, dueDate: true },
    });

    for (const task of tasks) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const existingQuery = {
        userId: pref.userId,
        taskId: task.id,
        type: "DEADLINE_OVERDUE" as const,
      };

      if (overdue.interval === "once") {
        const alreadySent = await prisma.notification.findFirst({ where: existingQuery });
        if (alreadySent) continue;
      } else {
        // daily — only once per day
        const alreadySentToday = await prisma.notification.findFirst({
          where: { ...existingQuery, createdAt: { gte: today } },
        });
        if (alreadySentToday) continue;
      }

      const dueStr = task.dueDate!.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const notif = await prisma.notification.create({
        data: {
          userId: pref.userId, taskId: task.id, type: "DEADLINE_OVERDUE",
          message: `A task is overdue`,
          metadata: { taskTitle: task.title, dueDate: dueStr },
        },
      });
      emitToUser(pref.userId, "notification:new", {
        id: notif.id, type: notif.type, message: notif.message, taskId: notif.taskId, createdAt: notif.createdAt,
      });
    }
  }
}
