import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

export type Context = {
  session: { user: { id: string; name: string; email: string } } | null;
  prisma: typeof prisma;
};

export const createTRPCContext = cache(async (): Promise<Context> => {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  return { session, prisma };
});

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});
