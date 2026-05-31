import { Server } from "socket.io";
import type { Server as HTTPServer } from "node:http";
import type { ServerToClientEvents, ClientToServerEvents } from "./events";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

declare global {
  // eslint-disable-next-line no-var
  var __socketIo: AppServer | undefined;
}

export function initSocketServer(httpServer: HTTPServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join:project", (projectId) => {
      socket.join(`project:${projectId}`);
    });
    socket.on("join:user", (userId) => {
      socket.join(`user:${userId}`);
    });
  });

  // Store on globalThis so any module context can access it
  global.__socketIo = io;
}

/** Emit a task event to all clients in a project room (works across module contexts) */
export function emitToProject<E extends keyof ServerToClientEvents>(
  projectId: string,
  event: E,
  payload: Parameters<ServerToClientEvents[E]>[0]
) {
  global.__socketIo?.to(`project:${projectId}`).emit(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event as any,
    payload
  );
}
