"use client";

import { useState } from "react";
import { X, Hash, Loader2, ArrowRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

export function JoinByCodeModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const trpc = useTRPC();

  const joinByCode = useMutation(
    trpc.projects.joinByCode.mutationOptions({
      onSuccess: (data) => {
        onClose();
        router.push(`/projects/${data.projectId}`);
      },
      onError: (err) => setError(err.message ?? "Invalid code"),
    })
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    joinByCode.mutate({ code: code.trim().toUpperCase() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-sm bg-card rounded-[16px] border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-subtle flex items-center justify-center">
              <Hash className="w-3.5 h-3.5 text-brand" />
            </div>
            <h2 className="text-[14px] font-semibold text-foreground">Join by Code</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground-2">Project Code</label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCD-1234"
              maxLength={9}
              className="w-full h-12 px-4 text-center text-lg font-bold tracking-widest font-mono bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all uppercase placeholder:text-muted-2 placeholder:text-sm placeholder:tracking-normal placeholder:font-normal"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-error bg-[oklch(97%_0.02_27)] border border-[oklch(88%_0.06_27)] rounded-lg px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!code.trim() || joinByCode.isPending}
            className="w-full h-10 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {joinByCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Join Project
          </button>
        </form>
      </div>
    </div>
  );
}
