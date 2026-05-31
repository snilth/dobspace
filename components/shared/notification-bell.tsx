"use client";

import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { usePusherUserEvent } from "@/hooks/use-pusher";
import { useSession } from "@/lib/auth/client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const active = pathname === "/notifications";

  const { data: count = 0 } = useQuery(
    trpc.notifications.unreadCount.queryOptions(undefined, { refetchInterval: 30_000 })
  );

  const { data: session } = useSession();
  usePusherUserEvent(session?.user.id ?? "", "notification:new", () => {
    queryClient.invalidateQueries({ queryKey: trpc.notifications.unreadCount.queryKey() });
  });

  return (
    <Link
      href="/notifications"
      title="Notifications"
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150",
        active
          ? "bg-sidebar-active text-sidebar-active-text"
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
      )}
    >
      <div className="relative flex-shrink-0">
        <Bell className={cn("w-4 h-4", active && "text-brand-light")} />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-brand text-brand-foreground text-[8px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </div>
      <span className="flex-1 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
        Notifications
      </span>
      {count > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand/20 text-brand-light opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 flex-shrink-0">
          {count}
        </span>
      )}
    </Link>
  );
}
