import { defineConfig, env } from "prisma/config";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

type Env = { DATABASE_URL: string; DIRECT_URL: string };

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: env<Env>("DIRECT_URL"),
  },
});
