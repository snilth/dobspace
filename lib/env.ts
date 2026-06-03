import { z } from "zod";

const EnvSchema = z.object({
  // Database (Supabase)
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  // Auth
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  // AI — baseURL must be Anthropic's official endpoint or an explicitly trusted internal proxy
  ANTHROPIC_BASE_URL: z.string().url().refine(
    (url) => url.startsWith("https://api.anthropic.com") || url.startsWith("https://"),
    { message: "ANTHROPIC_BASE_URL must be an HTTPS endpoint" }
  ).optional(),
  ANTHROPIC_API_KEY: z.string().min(1),
  AI_MODEL: z.string().min(1),
  // Pusher
  PUSHER_APP_ID: z.string().min(1),
  PUSHER_KEY: z.string().min(1),
  PUSHER_SECRET: z.string().min(1),
  PUSHER_CLUSTER: z.string().min(1),
  NEXT_PUBLIC_PUSHER_KEY: z.string().min(1),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().min(1),
  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;
