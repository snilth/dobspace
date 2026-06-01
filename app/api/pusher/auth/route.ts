import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Pusher from "pusher";
import { prisma } from "@/lib/db/prisma";

let _pusher: Pusher | null = null;
function getPusher() {
  if (!_pusher) {
    _pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return _pusher;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) return new Response("Bad Request", { status: 400 });

  const userId = session.user.id;

  if (channelName.startsWith("private-project-")) {
    const projectId = channelName.replace("private-project-", "");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true, workspace: { select: { ownerId: true } } },
    });
    if (!project) return new Response("Forbidden", { status: 403 });

    if (project.workspace.ownerId !== userId) {
      const pm = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (!pm) return new Response("Forbidden", { status: 403 });
    }
  } else if (channelName.startsWith("private-user-")) {
    const channelUserId = channelName.replace("private-user-", "");
    if (channelUserId !== userId) return new Response("Forbidden", { status: 403 });
  } else {
    return new Response("Forbidden", { status: 403 });
  }

  const authResponse = getPusher().authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
