import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: false,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your DevMind account",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Verify your email</h2>
            <p style="color:#666;margin-bottom:24px">Click the button below to verify your DevMind account.</p>
            <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none">Verify Email</a>
            <p style="color:#999;font-size:12px;margin-top:24px">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
          </div>
        `,
        text: `Verify your DevMind account: ${url}`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const workspace = await prisma.workspace.create({
            data: {
              name: `${user.name}'s Workspace`,
              ownerId: user.id,
            },
          });
          await prisma.workspaceMember.create({
            data: { workspaceId: workspace.id, userId: user.id },
          });
        },
      },
    },
  },
});

export type Auth = typeof auth;
