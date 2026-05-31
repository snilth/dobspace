import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  ANTHROPIC_BASE_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(1),
  AI_MODEL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;
