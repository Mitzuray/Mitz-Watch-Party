import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB helpers
vi.mock("./db", () => ({
  createRoom: vi.fn(async (data: { code: string; hostName: string }) => ({
    id: 1,
    code: data.code,
    hostName: data.hostName,
    videoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  getRoomByCode: vi.fn(async (code: string) => {
    if (code === "EXIST1") {
      return {
        id: 1,
        code: "EXIST1",
        hostName: "Host",
        videoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }),
  getMessagesByRoom: vi.fn(async () => [
    {
      id: 1,
      roomCode: "EXIST1",
      username: "Alice",
      text: "Olá!",
      createdAt: new Date(),
    },
  ]),
  insertMessage: vi.fn(async () => {}),
  upsertUser: vi.fn(async () => {}),
  getUserByOpenId: vi.fn(async () => undefined),
  getDb: vi.fn(async () => null),
}));

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("rooms.create", () => {
  it("cria uma sala e retorna objeto com código", async () => {
    const caller = appRouter.createCaller(createCtx());
    const room = await caller.rooms.create({ hostName: "Alice" });

    expect(room).toBeDefined();
    expect(room?.code).toBeDefined();
    expect(typeof room?.code).toBe("string");
    expect(room?.code.length).toBe(6);
    expect(room?.hostName).toBe("Alice");
  });
});

describe("rooms.get", () => {
  it("retorna sala existente pelo código", async () => {
    const caller = appRouter.createCaller(createCtx());
    const room = await caller.rooms.get({ code: "EXIST1" });

    expect(room).toBeDefined();
    expect(room.code).toBe("EXIST1");
    expect(room.hostName).toBe("Host");
  });

  it("lança erro para sala inexistente", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.rooms.get({ code: "NOPE00" })).rejects.toThrow("Sala nao encontrada");
  });
});

describe("rooms.messages", () => {
  it("retorna mensagens da sala", async () => {
    const caller = appRouter.createCaller(createCtx());
    const msgs = await caller.rooms.messages({ roomCode: "EXIST1" });

    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs[0]?.username).toBe("Alice");
    expect(msgs[0]?.text).toBe("Olá!");
  });
});
