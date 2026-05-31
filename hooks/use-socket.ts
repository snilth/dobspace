"use client";

import { useEffect, useRef } from "react";
import type { ServerToClientEvents } from "@/lib/socket/events";
import type { AppSocket } from "@/lib/socket/client";

export function useSocket(): AppSocket | null {
  if (typeof window === "undefined") return null;
  const { getSocket } = require("@/lib/socket/client");
  return getSocket();
}

export function useSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K]
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const { getSocket } = require("@/lib/socket/client");
    const socket: AppSocket = getSocket();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (...args: any[]) => (handlerRef.current as (...a: any[]) => void)(...args);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).on(event, fn);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { (socket as any).off(event, fn); };
  }, [event]);
}
