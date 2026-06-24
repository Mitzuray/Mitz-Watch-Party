import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { createRoom, getRoomByCode, getMessagesByRoom, updateRoomLeader, getYouTubeIntegration, getDriveIntegration, deleteYouTubeIntegration, deleteDriveIntegration } from "./db";
import { nanoid } from "nanoid";
import { extractVideoUrl } from "./videoExtractor";
import { extractGoogleDriveVideoUrl, parseGoogleDriveUrl } from "./googleDriveIntegration";
import { TRPCError } from "@trpc/server";

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

    extractVideo: publicProcedure
      .input(z.object({ url: z.string().url() }))
      .query(async ({ input }) => {
        const videoUrl = await extractVideoUrl(input.url);
        if (!videoUrl) {
          throw new Error("Nao foi possivel extrair o video deste link. Tente YouTube, Google Drive ou uma URL direta de video.");
        }
        return { videoUrl, originalUrl: input.url };
      }),

    extractGoogleDriveVideo: publicProcedure
      .input(z.object({ url: z.string().url() }))
      .query(async ({ input }) => {
        const fileId = parseGoogleDriveUrl(input.url);
        if (!fileId) {
          throw new Error("URL do Google Drive invalida");
        }
        const videoUrl = await extractGoogleDriveVideoUrl(fileId);
        if (!videoUrl) {
          throw new Error("Nao foi possivel extrair o video deste arquivo do Google Drive. Verifique se e um arquivo de video e se esta compartilhado.");
        }
        return { videoUrl, originalUrl: input.url, fileId };
      }),
  }),

  integrations: router({
    getStatus: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const youtubeIntegration = await getYouTubeIntegration(ctx.user.id);
      const driveIntegration = await getDriveIntegration(ctx.user.id);

      return {
        youtubeConnected: !!youtubeIntegration,
        driveConnected: !!driveIntegration,
      };
    }),

    disconnectYoutube: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await deleteYouTubeIntegration(ctx.user.id);
      return { success: true };
    }),

    disconnectDrive: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await deleteDriveIntegration(ctx.user.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;

// Ensure Google Drive credentials are available
if (!process.env.GOOGLE_DRIVE_CLIENT_ID || !process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
  console.warn("[Warning] Google Drive API credentials not configured. Google Drive video extraction will not work.");
}
