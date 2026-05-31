"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { usePusherUserEvent } from "@/hooks/use-pusher";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import Link from "next/link";

function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "TASK_ASSIGNED", label: "Assigned" },
  { key: "DEADLINE_APPROACHING", label: "Approaching" },
  { key: "DEADLINE_OVERDUE", label: "Overdue" },
] as const;

type FilterKey = typeof FILTERS[number]["key"];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery(trpc.notifications.list.queryOptions());
  const { data: unreadCount = 0 } = useQuery(trpc.notifications.unreadCount.queryOptions());

  const markRead = useMutation(trpc.notifications.markRead.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.notifications.list.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.notifications.unreadCount.queryKey() });
    },
  }));

  const markAllRead = useMutation(trpc.notifications.markAllRead.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.notifications.list.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.notifications.unreadCount.queryKey() });
    },
  }));

  const { data: session } = useSession();
  usePusherUserEvent(session?.user.id ?? "", "notification:new", () => {
    queryClient.invalidateQueries({ queryKey: trpc.notifications.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.notifications.unreadCount.queryKey() });
  });

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs font-medium text-muted mb-1 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            Notifications
          </p>
          <h1 className="text-[22px] font-bold text-foreground leading-none">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted mt-1.5">
              <span className="font-semibold text-brand">{unreadCount}</span> unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate(undefined)}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-border bg-card text-foreground-2 text-sm font-semibold rounded-[8px] hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            {markAllRead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Mark all read
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {FILTERS.map((f) => {
          const count = f.key === "all"
            ? notifications.length
            : f.key === "unread"
              ? notifications.filter((n) => !n.read).length
              : notifications.filter((n) => n.type === f.key).length;
          if (f.key !== "all" && f.key !== "unread" && count === 0) return null;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-7 rounded-full text-[12px] font-semibold border transition-colors",
                filter === f.key
                  ? "bg-brand text-brand-foreground border-brand"
                  : "bg-card text-muted border-border hover:border-brand/40 hover:text-brand"
              )}
            >
              {f.label}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center",
                  filter === f.key ? "bg-white/20" : "bg-surface-3"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-card rounded-[12px] border border-border overflow-hidden divide-y divide-border">
          {filtered.map((n) => (
            <NotifRow
              key={n.id}
              notification={n}
              onMarkRead={!n.read ? () => markRead.mutate({ id: n.id }) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotifRow({ notification: n, onMarkRead }: {
  notification: {
    id: string;
    message: string;
    read: boolean;
    createdAt: Date | string;
    task?: { projectId: string; project?: { name: string } | null } | null;
  };
  onMarkRead?: () => void;
}) {
  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors",
      !n.read && "bg-brand-subtle/40"
    )}>
      <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", n.read ? "bg-border-strong" : "bg-brand")} />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-foreground leading-relaxed">{n.message}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-[11px] text-muted">{timeAgo(n.createdAt)}</span>
          {n.task?.project && (
            <span className="text-[11px] text-muted font-medium">{n.task.project.name}</span>
          )}
          {n.task && (
            <Link
              href={`/projects/${n.task.projectId}`}
              className="text-[11px] text-brand font-medium hover:underline flex items-center gap-0.5"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              View task
            </Link>
          )}
        </div>
      </div>

      {onMarkRead && (
        <button onClick={onMarkRead} title="Mark as read"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-brand hover:bg-brand-subtle transition-colors flex-shrink-0 mt-0.5">
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-24 text-center bg-card rounded-[12px] border border-dashed border-border">
      <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center mb-3">
        <Bell className="w-6 h-6 text-muted" />
      </div>
      <p className="text-[13px] font-semibold text-foreground mb-1">No notifications</p>
      <p className="text-xs text-muted">New activity will appear here</p>
    </div>
  );
}
