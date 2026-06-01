import PusherJs from "pusher-js";

let _pusher: PusherJs | null = null;

export function getPusherClient(): PusherJs | null {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) return null;

  if (!_pusher) {
    _pusher = new PusherJs(key, { cluster, authEndpoint: "/api/pusher/auth" });
  }
  return _pusher;
}
