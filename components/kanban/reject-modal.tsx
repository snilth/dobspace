"use client";

import { useState } from "react";
import { X, Loader2, XCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

type Props = {
  taskId: string;
  taskTitle: string;
  onClose: () => void;
  onRejected: () => void;
};

export function RejectModal({ taskId, taskTitle, onClose, onRejected }: Props) {
  const [reason, setReason] = useState("");
  const trpc = useTRPC();

  const reject = useMutation(trpc.tasks.reject.mutationOptions({
    onSuccess: onRejected,
  }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    reject.mutate({ id: taskId, reason: reason.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-sm bg-card rounded-[16px] border border-border shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[oklch(95%_0.04_27)] flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5 text-error" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-foreground leading-none">Reject to Backlog</h2>
              <p className="text-[11px] text-muted mt-0.5 truncate max-w-[200px]">{taskTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Rejection reason</label>
            <textarea
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Design doesn't match spec, missing unit tests..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-error/50 focus:ring-2 focus:ring-error/8 transition-all resize-none placeholder:text-muted-2"
            />
            <p className="text-[11px] text-muted text-right">{reason.length}/500</p>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 border border-border rounded-[8px] text-sm font-medium text-foreground-2 hover:bg-surface-2 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!reason.trim() || reject.isPending}
              className="flex-1 h-9 bg-error text-white text-sm font-semibold rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5">
              {reject.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Reject to Backlog
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
