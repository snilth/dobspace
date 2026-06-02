import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const PURGE_SECRET = process.env.PURGE_SECRET;
const RETAIN_DAYS = 30;

export async function POST(req: Request) {
  const secret = req.headers.get("x-purge-secret");
  if (!PURGE_SECRET || secret !== PURGE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETAIN_DAYS);

  const { count } = await prisma.notification.deleteMany({
    where: {
      dismissed: true,
      dismissedAt: { lt: cutoff },
    },
  });

  return NextResponse.json({ deleted: count, cutoff });
}
