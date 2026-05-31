import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { anthropic } from "@/lib/ai/client";
import { buildProjectContext } from "@/lib/ai/context-builder";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { redis } from "@/lib/db/redis";
import { prisma } from "@/lib/db/prisma";

const RATE_LIMIT = 20;
const RATE_WINDOW = 60;

const BodySchema = z.object({
  projectId: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(2000),
    })
  ).min(1).max(50),
});

async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:ai:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, RATE_WINDOW);
  return count <= RATE_LIMIT;
}

async function userCanAccessProject(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, workspace: { select: { ownerId: true } } },
  });
  if (!project) return false;

  // Workspace owner has full access
  if (project.workspace.ownerId === userId) return true;

  // Check workspace membership
  const wsMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!wsMember) return false;

  // Check project membership
  const pm = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return !!pm;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Invalid request", { status: 400 });
  }

  const allowed = await checkRateLimit(session.user.id);
  if (!allowed) {
    return new Response("Rate limit exceeded. Try again in a minute.", { status: 429 });
  }

  const { projectId, messages } = parsed.data;

  // Authorization: verify user has access to this project
  const hasAccess = await userCanAccessProject(session.user.id, projectId);
  if (!hasAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  const context = await buildProjectContext(projectId);
  const systemPrompt = buildSystemPrompt(context);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = await anthropic.messages.stream({
          model: process.env.AI_MODEL ?? "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const chunk of aiStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const data = JSON.stringify({ text: chunk.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch {
        // Generic error — don't leak internals to client
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "An error occurred" })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
