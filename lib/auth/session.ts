import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./index";

/**
 * Cached per-request session — deduplicates getSession() calls across Server Components.
 * React cache() ensures this runs at most once per request regardless of how many
 * Server Components call it.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
