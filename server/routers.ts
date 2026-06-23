import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createRoom, getRoomByCode, getMessagesByRoom, updateRoomLeader } from "./db";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  rooms: router({
    create: publicProcedure
      .input(z.object({ hostName: z.string().min(1).max(64) }))
      .mutation(async ({ input }) => {
        let code: string;
        let attempts = 0;
        do {
          code = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 6);
          attempts++;
          if (attempts > 20) throw new Error("Could not generate unique room code");
          const existing = await getRoomByCode(code);
          if (!existing) break;
        } while (true);

        const room = await createRoom({ code, hostName: input.hostName, leaderName: input.hostName });
        return room;
      }),

    get: publicProcedure
      .input(z.object({ code: z.string().min(1).max(8) }))
      .query(async ({ input }) => {
        const room = await getRoomByCode(input.code.toUpperCase());
        if (!room) throw new Error("Sala nao encontrada");
        return room;
      }),

    messages: publicProcedure
      .input(z.object({ roomCode: z.string().min(1).max(8) }))
      .query(async ({ input }) => {
        return getMessagesByRoom(input.roomCode.toUpperCase(), 100);
      }),

    transferLeadership: publicProcedure
      .input(z.object({ roomCode: z.string().min(1).max(8), newLeaderName: z.string().min(1).max(128) }))
      .mutation(async ({ input }) => {
        const room = await getRoomByCode(input.roomCode.toUpperCase());
        if (!room) throw new Error("Sala nao encontrada");
        await updateRoomLeader(input.roomCode.toUpperCase(), input.newLeaderName);
        return { success: true, newLeader: input.newLeaderName };
      }),
  }),
});

export type AppRouter = typeof appRouter;
