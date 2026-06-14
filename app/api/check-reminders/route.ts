import { NextResponse } from "next/server";
import { runReminderCheck } from "@/lib/jobs/reminder-check";
import { runAssignmentDeadlineCheck } from "@/lib/jobs/assignment-deadline-check";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await Promise.all([runReminderCheck(), runAssignmentDeadlineCheck()]);

  return NextResponse.json({ ok: true });
}
