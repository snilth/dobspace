"use client";

export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { CatIcon } from "@/components/shared/cat-icon";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: currentWs } = useQuery(trpc.workspace.getCurrent.queryOptions());
  const workspaceId = currentWs?.workspace.id;

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (project) => {
        queryClient.invalidateQueries({ queryKey: trpc.projects.listMine.queryKey() });
        router.push(`/projects/${project.id}`);
      },
      onError: () => {
        if (submitBtnRef.current) submitBtnRef.current.disabled = false;
      },
    })
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !workspaceId || submitBtnRef.current?.disabled) return;
    if (submitBtnRef.current) submitBtnRef.current.disabled = true;
    createProject.mutate({
      workspaceId,
      data: { name: name.trim(), description: description.trim() || undefined },
    });
  }

  return (
    <div className="min-h-screen bg-surface-2/40 flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground mb-6 transition-colors group w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Projects
        </Link>

        <div className="bg-card rounded-[16px] border border-border shadow-[0_4px_24px_-8px_oklch(0%_0_0/8%)] overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-surface-2/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-brand flex items-center justify-center shadow-sm shadow-brand/30">
              <CatIcon className="w-4 h-4 text-brand-foreground" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-foreground leading-none">New Project</h1>
              <p className="text-[11px] text-muted mt-0.5">Add to {currentWs?.workspace.name ?? "Workspace"}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">Project name *</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. DevMind Platform"
                maxLength={100}
                required
                className="w-full h-10 px-3 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-3 focus:ring-brand/8 transition-all placeholder:text-muted-2"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground-2">
                Description{" "}
                <span className="text-muted font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief project description"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-3 focus:ring-brand/8 transition-all resize-none placeholder:text-muted-2"
              />
            </div>

            {createProject.error && (
              <div className="flex items-center gap-2 text-xs text-error bg-[oklch(97%_0.03_27)] border border-[oklch(88%_0.08_27)] rounded-lg px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
                Something went wrong. Try again.
              </div>
            )}

            <button
              type="submit"
              ref={submitBtnRef}
              disabled={!name.trim() || !workspaceId || createProject.isPending}
              className="w-full h-10 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-brand/20"
            >
              {createProject.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ArrowRight className="w-4 h-4" />
              }
              Create Project
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
