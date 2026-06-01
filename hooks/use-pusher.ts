"use client";

import { useEffect, useRef } from "react";
import type { ServerToClientEvents } from "@/lib/socket/events";

export function usePusherChannel(channelName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const { getPusherClient } = require("@/lib/pusher/client");
    const pusher = getPusherClient();
    if (!pusher || !channelName) return;

    channelRef.current = pusher.subscribe(channelName);
    return () => {
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [channelName]);

  return channelRef;
}

export function usePusherEvent<K extends keyof ServerToClientEvents>(
  channelName: string,
  event: K,
  handler: ServerToClientEvents[K]
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const { getPusherClient } = require("@/lib/pusher/client");
    const pusher = getPusherClient();
    if (!pusher || !channelName) return;

    const channel = pusher.subscribe(channelName);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (...args: any[]) => (handlerRef.current as (...a: any[]) => void)(...args);
    channel.bind(event, fn);

    return () => {
      channel.unbind(event, fn);
      pusher.unsubscribe(channelName);
    };
  }, [channelName, event]);
}

export function usePusherUserEvent(
  userId: string,
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (payload: any) => void
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!userId) return;
    const { getPusherClient } = require("@/lib/pusher/client");
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `private-user-${userId}`;
    const channel = pusher.subscribe(channelName);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (...args: any[]) => (handlerRef.current as (...a: any[]) => void)(...args);
    channel.bind(event, fn);

    return () => {
      channel.unbind(event, fn);
      pusher.unsubscribe(channelName);
    };
  }, [userId, event]);
}
