import Pusher from "pusher";
import type { ServerToClientEvents } from "@/lib/socket/events";

let _pusher: Pusher | null = null;

function getPusher(): Pusher | null {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) return null;

  if (!_pusher) {
    _pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
  }
  return _pusher;
}

export function emitToProject<E extends keyof ServerToClientEvents>(
  projectId: string,
  event: E,
  payload: Parameters<ServerToClientEvents[E]>[0]
) {
  const pusher = getPusher();
  if (!pusher) return;
  pusher.trigger(`private-project-${projectId}`, event, payload).catch(() => {});
}

export function emitToUser(
  userId: string,
  event: string,
  payload: unknown
) {
  const pusher = getPusher();
  if (!pusher) return;
  pusher.trigger(`private-user-${userId}`, event, payload).catch(() => {});
}
