"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { usePusherUserEvent } from "@/hooks/use-pusher";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Bell, Check, CheckCheck, ExternalLink, Loader2, Trash2, X, Info, MailOpen, UserPlus, Pencil, Clock, AlertTriangle, ArrowRight } from "lucide-react";
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

type NotifMeta = {
  actor?: string;
  taskTitle?: string;
  project?: string | null;
  dueDate?: string;
  changes?: Record<string, string>;
};

type Notif = {
  id: string;
  type: string;
  message: string;
  metadata?: NotifMeta | null;
  read: boolean;
  createdAt: Date | string;
  task?: { projectId: string; project?: { name: string } | null } | null;
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  TASK_ASSIGNED:        { icon: UserPlus,      color: "text-[oklch(52%_0.19_228)]", bg: "bg-[oklch(95%_0.03_228)]", label: "Assigned" },
  TASK_UPDATED:         { icon: Pencil,         color: "text-[oklch(52%_0.19_278)]", bg: "bg-[oklch(95%_0.03_278)]", label: "Updated"  },
  TASK_MOVED:           { icon: ArrowRight,     color: "text-[oklch(52%_0.19_148)]", bg: "bg-[oklch(95%_0.03_148)]", label: "Moved"    },
  DEADLINE_APPROACHING: { icon: Clock,          color: "text-[oklch(55%_0.19_55)]",  bg: "bg-[oklch(96%_0.04_55)]",  label: "Deadline" },
  DEADLINE_OVERDUE:     { icon: AlertTriangle,  color: "text-[oklch(52%_0.22_27)]",  bg: "bg-[oklch(96%_0.04_27)]",  label: "Overdue"  },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
] as const;
type Tab = typeof TABS[number]["key"];

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDismiss, setConfirmDismiss] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.notifications.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.notifications.unreadCount.queryKey() });
  };

  const { data: rawNotifications = [], isLoading } = useQuery(trpc.notifications.list.queryOptions());
  const notifications = rawNotifications as unknown as Notif[];
  const { data: unreadCount = 0 } = useQuery(trpc.notifications.unreadCount.queryOptions());

  const markRead = useMutation(trpc.notifications.markRead.mutationOptions({ onSuccess: invalidate }));
  const markUnread = useMutation(trpc.notifications.markUnread.mutationOptions({ onSuccess: invalidate }));
  const markAllRead = useMutation(trpc.notifications.markAllRead.mutationOptions({ onSuccess: invalidate }));
  const dismiss = useMutation(trpc.notifications.dismiss.mutationOptions({ onSuccess: invalidate }));
  const clearRead = useMutation(trpc.notifications.clearRead.mutationOptions({ onSuccess: invalidate }));

  const { data: session } = useSession();
  usePusherUserEvent(session?.user.id ?? "", "notification:new", invalidate);

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Fixed info button */}
      <div className="fixed top-4 right-4 z-50">
        {showInfo && (
          <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-xl p-4 text-[12px]">
            <p className="font-semibold text-foreground mb-3">How notifications work</p>
            <div className="space-y-2 text-muted">
              <p><span className="text-foreground-2 font-medium">Unread</span> — new activity you haven&apos;t seen yet</p>
              <p><span className="text-foreground-2 font-medium">Mark as read</span> — moves to the Read section</p>
              <p><span className="text-foreground-2 font-medium">Dismiss</span> — hides one notification from your inbox</p>
              <p><span className="text-foreground-2 font-medium">Clear read</span> — hides all read notifications at once</p>
            </div>
            <div className="mt-3 pt-3 border-t border-border space-y-1.5 text-muted">
              <p className="font-semibold text-foreground-2 mb-1">Retention</p>
              <p>Dismissed notifications are hidden from your inbox but <span className="text-foreground-2 font-medium">not immediately deleted</span> — they remain in your data and are included in workspace backups.</p>
              <p>After <span className="text-foreground-2 font-medium">30 days</span>, dismissed notifications are permanently removed from the database.</p>
              <p>Up to <span className="text-foreground-2 font-medium">500 notifications</span> are shown at a time.</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowInfo(v => !v)}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center border shadow-sm transition-colors",
            showInfo ? "bg-brand text-brand-foreground border-brand" : "bg-card border-border text-muted hover:text-foreground hover:bg-surface-2"
          )}
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs font-medium text-muted mb-1 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            Notifications
          </p>
          <h1 className="text-[22px] font-bold text-foreground leading-none">Notifications</h1>
        </div>
        <div className="flex items-center gap-2">
          {read.length > 0 && tab !== "unread" && (
            <button onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-border bg-card text-foreground-2 text-sm font-semibold rounded-[8px] hover:bg-surface-2 transition-colors">
              <Trash2 className="w-4 h-4" />
              Clear read
            </button>
          )}
          {unreadCount > 0 && (
            <button onClick={() => markAllRead.mutate(undefined)} disabled={markAllRead.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-border bg-card text-foreground-2 text-sm font-semibold rounded-[8px] hover:bg-surface-2 transition-colors disabled:opacity-50">
              {markAllRead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5">
        {TABS.map((t) => {
          const count = t.key === "all" ? notifications.length : t.key === "unread" ? unread.length : read.length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[12px] font-semibold border transition-colors",
                tab === t.key ? "bg-brand text-brand-foreground border-brand" : "bg-card text-muted border-border hover:border-brand/40 hover:text-brand"
              )}>
              {t.label}
              {count > 0 && (
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  tab === t.key ? "bg-white/20" : "bg-surface-3")}>
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
      ) : notifications.length === 0 || (tab === "unread" && unread.length === 0) || (tab === "read" && read.length === 0) ? (
        <EmptyState />
      ) : (
        <>
          {confirmDismiss && (
            <ConfirmDismissModal
              isPending={dismiss.isPending}
              onCancel={() => setConfirmDismiss(null)}
              onConfirm={() => dismiss.mutate({ id: confirmDismiss }, { onSuccess: () => setConfirmDismiss(null) })}
            />
          )}
          {confirmClear && (
            <ConfirmClearModal
              isPending={clearRead.isPending}
              onCancel={() => setConfirmClear(false)}
              onConfirm={() => clearRead.mutate(undefined, { onSuccess: () => setConfirmClear(false) })}
            />
          )}
          <div className="space-y-6">
            {(tab === "all" || tab === "unread") && unread.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2.5">Unread · {unread.length}</p>
                <div className="bg-card rounded-[12px] border border-border overflow-hidden divide-y divide-border">
                  {unread.map((n) => (
                    <NotifRow key={n.id} notification={n}
                      onMarkRead={() => markRead.mutate({ id: n.id })}
                      onDismiss={() => setConfirmDismiss(n.id)} />
                  ))}
                </div>
              </section>
            )}
            {(tab === "all" || tab === "read") && read.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2.5">Read · {read.length}</p>
                <div className="bg-card rounded-[12px] border border-border overflow-hidden divide-y divide-border opacity-70">
                  {read.map((n) => (
                    <NotifRow key={n.id} notification={n}
                      onMarkUnread={() => markUnread.mutate({ id: n.id })}
                      onDismiss={() => setConfirmDismiss(n.id)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NotifRow({ notification: n, onMarkRead, onMarkUnread, onDismiss }: {
  notification: Notif; onMarkRead?: () => void; onMarkUnread?: () => void; onDismiss?: () => void;
}) {
  const cfg = TYPE_CONFIG[n.type] ?? { icon: Bell, color: "text-muted", bg: "bg-surface-2", label: n.type };
  const Icon = cfg.icon;
  const meta = n.metadata as NotifMeta | null | undefined;

  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors relative",
      !n.read && "bg-brand-subtle/30"
    )}>
      {/* Unread left border */}
      {!n.read && <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-brand" />}

      {/* Type icon */}
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
        <Icon className={cn("w-4 h-4", cfg.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md", cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
            {meta?.actor && (
              <span className="text-[11px] text-muted">by <span className="font-semibold text-foreground-2">{meta.actor}</span></span>
            )}
          </div>
          <span className="text-[11px] text-muted flex-shrink-0">{timeAgo(n.createdAt)}</span>
        </div>

        {/* Task title */}
        <p className={cn("text-[14px] font-semibold leading-snug mb-2", n.read ? "text-foreground-2" : "text-foreground")}>
          {meta?.taskTitle ?? n.message}
        </p>

        {/* Structured metadata */}
        <div className="space-y-1 mb-2">
          {(meta?.project ?? n.task?.project?.name) && (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-muted w-16 flex-shrink-0">Project</span>
              <span className="font-medium text-foreground-2">{meta?.project ?? n.task?.project?.name}</span>
            </div>
          )}
          {meta?.dueDate && (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-muted w-16 flex-shrink-0">Due date</span>
              <span className="font-medium text-foreground-2">{meta.dueDate}</span>
            </div>
          )}
          {meta?.changes && Object.entries(meta.changes).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 text-[12px]">
              <span className="text-muted w-16 flex-shrink-0 capitalize">{key === "dueDate" ? "Due date" : key}</span>
              <span className="font-semibold text-brand">{String(val)}</span>
            </div>
          ))}
        </div>

        {/* View task link */}
        {n.task && (
          <Link href={`/projects/${n.task.projectId}`}
            className="text-[11px] text-brand font-semibold hover:underline flex items-center gap-0.5 w-fit">
            <ExternalLink className="w-2.5 h-2.5" />
            View task
          </Link>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
        {onMarkRead && (
          <button onClick={onMarkRead} title="Mark as read"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-brand hover:bg-brand-subtle transition-colors">
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        {onMarkUnread && (
          <button onClick={onMarkUnread} title="Mark as unread"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-brand hover:bg-brand-subtle transition-colors">
            <MailOpen className="w-3.5 h-3.5" />
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} title="Dismiss"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-error hover:bg-[oklch(96%_0.03_27)] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function ConfirmDismissModal({ onConfirm, onCancel, isPending }: {
  onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-sm bg-card rounded-[16px] border border-border shadow-2xl p-5">
        <h2 className="text-[15px] font-bold text-foreground mb-1">Dismiss this notification?</h2>
        <p className="text-[13px] text-muted mb-5">It will be removed from your inbox. Your data is still kept.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-9 border border-border rounded-[8px] text-sm font-medium text-foreground-2 hover:bg-surface-2 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 h-9 bg-brand text-brand-foreground rounded-[8px] text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmClearModal({ onConfirm, onCancel, isPending }: {
  onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-sm bg-card rounded-[16px] border border-border shadow-2xl p-5">
        <div className="w-10 h-10 rounded-xl bg-[oklch(93%_0.04_27)] flex items-center justify-center mb-3">
          <Trash2 className="w-5 h-5 text-error" />
        </div>
        <h2 className="text-[15px] font-bold text-foreground mb-1">Clear all read notifications?</h2>
        <p className="text-[13px] text-muted mb-5">These notifications will be removed from your inbox. This action cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-9 border border-border rounded-[8px] text-sm font-medium text-foreground-2 hover:bg-surface-2 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 h-9 bg-error text-white rounded-[8px] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-1.5">
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Clear all
          </button>
        </div>
      </div>
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
