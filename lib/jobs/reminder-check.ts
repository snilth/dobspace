import { prisma } from "@/lib/db/prisma";
import { emitToUser } from "@/lib/socket/server";

// Fires a Notification for every personal Reminder whose remindAt has arrived.
export async function runReminderCheck() {
  const now = new Date();

  const due = await prisma.reminder.findMany({
    where: { dismissed: false, notifiedAt: null, remindAt: { lte: now } },
    select: { id: true, userId: true, text: true, remindAt: true },
  });

  for (const reminder of due) {
    const notif = await prisma.notification.create({
      data: {
        userId: reminder.userId,
        reminderId: reminder.id,
        type: "REMINDER",
        message: reminder.text,
        metadata: { reminderText: reminder.text },
      },
    });
    await prisma.reminder.update({ where: { id: reminder.id }, data: { notifiedAt: now } });
    emitToUser(reminder.userId, "notification:new", {
      id: notif.id, type: notif.type, message: notif.message, taskId: null, createdAt: notif.createdAt,
    });
  }
}
