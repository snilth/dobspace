import PusherJs from "pusher-js";

let _pusher: PusherJs | null = null;

export function getPusherClient(): PusherJs | null {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) return null;

  if (!_pusher) {
    PusherJs.logToConsole = process.env.NODE_ENV !== "production";
    _pusher = new PusherJs(key, { cluster, authEndpoint: "/api/pusher/auth" });
    _pusher.connection.bind("error", (err: unknown) => console.error("[Pusher] connection error", err));
    _pusher.connection.bind("state_change", ({ current }: { current: string }) => console.log("[Pusher] state →", current));
  }
  return _pusher;
}
