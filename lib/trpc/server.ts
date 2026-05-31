import "server-only";
import { cache } from "react";
import { createCallerFactory } from "./init";
import { createTRPCContext } from "./init";
import { appRouter } from "./router";

const createCaller = createCallerFactory(appRouter);

export const createServerCaller = cache(async () => {
  const ctx = await createTRPCContext();
  return createCaller(ctx);
});
