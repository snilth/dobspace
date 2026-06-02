import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";

const VALID_ACCENTS = ["indigo", "yellow", "blue", "pink", "green", "kimmy"] as const;
const VALID_MODES = ["light", "dark", "system"] as const;

export const userThemeRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { themeAccent: true, themeMode: true },
    });
    return {
      accent: (user?.themeAccent ?? null) as typeof VALID_ACCENTS[number] | null,
      mode: (user?.themeMode ?? null) as typeof VALID_MODES[number] | null,
    };
  }),

  set: protectedProcedure
    .input(z.object({
      accent: z.enum(VALID_ACCENTS).optional(),
      mode: z.enum(VALID_MODES).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          ...(input.accent !== undefined ? { themeAccent: input.accent } : {}),
          ...(input.mode !== undefined ? { themeMode: input.mode } : {}),
        },
      });
    }),
});
