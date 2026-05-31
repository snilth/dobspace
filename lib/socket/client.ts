import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "./events";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (typeof window === "undefined") {
    throw new Error("getSocket() must be called client-side only");
  }
  if (!socket) {
    // Dynamic import to avoid SSR issues
    const { io } = require("socket.io-client");
    socket = io(window.location.origin, {
      path: "/socket.io",
      autoConnect: true,
    }) as AppSocket;
  }
  return socket;
}
