"use client";

import { useState } from "react";
import { Loader2, Crown, Trash2, FolderKanban, Download } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Section, Field, SaveButton, ErrorMsg } from "./account-section";
import { isSafeImageSrc } from "@/components/shared/avatar";

const PERM_STYLE: Record<string, string> = {
  VIEWER: "text-muted border-border",
  EDITOR: "text-[oklch(42%_0.18_228)] border-[oklch(85%_0.08_228)] dark:text-[oklch(68%_0.17_228)] dark:border-[oklch(40%_0.12_228)]",
  MANAGER: "text-brand border-brand-muted",
};
const PERM_LABEL: Record<string, string> = { VIEWER: "View", EDITOR: "Edit", MANAGER: "Manage" };

type Member = {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string; image?: string | null };
  projects: { id: string; name: string; permission: string }[];
};

type Props = {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
  members: Member[];
  currentUserId: string;
  currentUserEmail: string;
};

export function WorkspaceSection({ workspaceId, workspaceName, isOwner, members, currentUserId, currentUserEmail }: Props) {
  const [name, setName] = useState(workspaceName);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateWorkspace = useMutation(trpc.workspace.update.mutationOptions({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: trpc.workspace.getCurrent.queryKey() });
    },
    onError: () => setNameError("Failed to save. Try again."),
  }));

  const removeMember = useMutation(trpc.workspace.removeMember.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.workspace.membersWithProjects.queryKey({ workspaceId }) }),
  }));

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === workspaceName) return;
    setNameError("");
    updateWorkspace.mutate({ workspaceId, name: name.trim() });
  }

  const dirty = name.trim() !== workspaceName && name.trim().length > 0;

  return (
    <Section title="Workspace" description="Manage workspace and members">
      {/* Workspace name — owner only */}
      {isOwner && (
        <form onSubmit={handleSaveName} className="pb-5 mb-5 border-b border-border space-y-4">
          <Field label="Workspace name" value={name} onChange={setName} placeholder="Workspace name" />
          {nameError && <ErrorMsg>{nameError}</ErrorMsg>}
          <div className="flex justify-end">
            <SaveButton saving={updateWorkspace.isPending} saved={saved} disabled={!dirty} />
          </div>
        </form>
      )}

      {/* Members overview */}
      <div>
        <p className="text-xs font-semibold text-foreground-2 mb-3">
          Members ({members.filter(m => m.userId !== currentUserId).length})
          {isOwner && <span className="font-normal text-muted ml-1">· Invite via project join code</span>}
        </p>

        <div className="space-y-2">
          {members.filter(m => m.userId !== currentUserId).map((m) => {
            const isSelf = m.userId === currentUserId;
            const isThisOwner = m.userId === currentUserId && isOwner;
            const canRemove = isOwner && !isSelf;

            return (
              <div key={m.id} className="p-3 rounded-[10px] border border-border bg-card hover:bg-surface-2 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {m.user.image && isSafeImageSrc(m.user.image)
                      ? <img src={m.user.image} alt={m.user.name} className="w-full h-full object-cover" />
                      : <span className="text-[11px] font-bold text-brand">{m.user.name.slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground leading-none mb-0.5 truncate">
                      {m.user.name} {isSelf && <span className="text-muted font-normal text-[12px]">(you)</span>}
                    </p>
                    <p className="text-[11px] text-muted truncate">{m.user.email}</p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isThisOwner && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border bg-[oklch(95%_0.05_278)] text-[oklch(42%_0.2_278)] border-[oklch(85%_0.08_278)]">
                        <Crown className="w-3 h-3" />
                        Owner
                      </span>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => removeMember.mutate({ workspaceId, userId: m.userId })}
                        disabled={removeMember.isPending}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-[oklch(95%_0.03_27)] hover:text-error transition-colors"
                        title="Remove from workspace"
                      >
                        {removeMember.isPending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Projects this member is in */}
                {m.projects.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-1.5">
                    {m.projects.map((p) => (
                      <span key={p.id} className={cn(
                        "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border",
                        PERM_STYLE[p.permission]
                      )}>
                        <FolderKanban className="w-2.5 h-2.5" />
                        {p.name}
                        <span className="opacity-60">· {PERM_LABEL[p.permission]}</span>
                      </span>
                    ))}
                  </div>
                )}

                {m.projects.length === 0 && !isThisOwner && (
                  <p className="mt-2 pt-2 border-t border-border text-[10px] text-muted">Not in any project yet</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Backup — dev only */}
      {currentUserEmail === "vivi@email.dev" && (
        <div className="pt-5 mt-5 border-t border-border">
          <p className="text-xs font-semibold text-foreground-2 mb-1">Data Backup</p>
          <p className="text-xs text-muted mb-3">Download all workspace data as JSON — projects, tasks, members, notifications.</p>
          <ExportButton workspaceId={workspaceId} />
        </div>
      )}
    </Section>
  );
}

function ExportButton({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const [exporting, setExporting] = useState(false);
  const { refetch } = useQuery({ ...trpc.workspace.exportData.queryOptions({ workspaceId }), enabled: false });

  async function handleExport() {
    setExporting(true);
    try {
      const { data } = await refetch();
      if (!data) return;
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dobspace-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 px-4 py-2 border border-border rounded-[8px] text-sm font-semibold text-foreground-2 hover:bg-surface-2 hover:border-brand/30 hover:text-brand transition-colors disabled:opacity-50"
    >
      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {exporting ? "Exporting…" : "Export workspace data"}
    </button>
  );
}
