import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { anthropic } from "@/lib/ai/client";
import { buildProjectContext } from "@/lib/ai/context-builder";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { redis } from "@/lib/db/redis";

const RATE_LIMIT = 20; // requests per minute per user
const RATE_WINDOW = 60; // seconds

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
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
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
