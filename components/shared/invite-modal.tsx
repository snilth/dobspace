"use client";

import { useState } from "react";
import { X, Copy, Check, Users, UserPlus, Crown, Loader2, UserX, RefreshCw, Hash, ChevronDown } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const PERM_LABEL: Record<string, string> = { VIEWER: "View only", EDITOR: "Can edit", MANAGER: "Can manage" };
const PERM_DESC: Record<string, string> = {
  VIEWER: "Read only",
  EDITOR: "Create / edit / delete tasks",
  MANAGER: "Everything + assign tasks",
};
const PERM_STYLE: Record<string, string> = {
  VIEWER: "text-muted border-border",
  EDITOR: "text-[oklch(42%_0.18_228)] border-[oklch(85%_0.08_228)]",
  MANAGER: "text-brand border-brand-muted",
};

type Props = {
  workspaceId: string;
  workspaceName: string;
  projectId: string;
  projectName: string;
  initialJoinCode?: string | null;
  /** Only workspace owner gets full management UI */
  canManage?: boolean;
  onClose: () => void;
};

export function InviteModal({ workspaceId, projectId, projectName, initialJoinCode, canManage, onClose }: Props) {
  const [joinCode, setJoinCode] = useState<string | null>(initialJoinCode ?? null);
  const [copied, setCopied] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: projectMembers = [], isLoading: pmLoading } = useQuery(
    trpc.projects.members.queryOptions({ projectId, workspaceId })
  );
  const { data: workspaceMembers = [] } = useQuery({
    ...trpc.workspace.members.queryOptions({ workspaceId }),
    enabled: !!canManage,
  });

  const generateCode = useMutation(
    trpc.projects.generateCode.mutationOptions({
      onSuccess: (data) => { if (data.joinCode) setJoinCode(data.joinCode); },
    })
  );
  const addMember = useMutation(
    trpc.projects.addMember.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.projects.members.queryKey({ projectId, workspaceId }) }),
    })
  );
  const removeMember = useMutation(
    trpc.projects.removeMember.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.projects.members.queryKey({ projectId, workspaceId }) }),
    })
  );
  const updatePermission = useMutation(
    trpc.projects.updateMemberPermission.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.projects.members.queryKey({ projectId, workspaceId }) }),
    })
  );
  const updateTag = useMutation(
    trpc.projects.updateMemberTag.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.projects.members.queryKey({ projectId, workspaceId }) }),
    })
  );

  async function handleCopy() {
    if (!joinCode) return;
    await navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const projectMemberIds = new Set(projectMembers.map((m) => m.user.id));
  const addableMembers = canManage
    ? workspaceMembers.filter((m) => !projectMemberIds.has(m.user.id))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-lg bg-card rounded-[16px] border border-border shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-subtle flex items-center justify-center">
              <UserPlus className="w-3.5 h-3.5 text-brand" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-foreground leading-none">Team</h2>
              <p className="text-[11px] text-muted mt-0.5">{projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-2 flex items-center justify-center text-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto">

          {/* Join Code — Owner only */}
          {canManage && (
            <div>
              <p className="text-xs font-semibold text-foreground-2 mb-1.5">Invite Code</p>
              <p className="text-[11px] text-muted mb-3">Share this code → Dashboard → "Join by Code"</p>
              {joinCode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-surface-2 rounded-[10px] border border-border">
                    <Hash className="w-4 h-4 text-muted flex-shrink-0" />
                    <span className="flex-1 text-xl font-bold text-foreground tracking-widest font-mono">{joinCode}</span>
                    <button
                      onClick={handleCopy}
                      className={cn("flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-[6px] transition-colors flex-shrink-0",
                        copied ? "bg-[oklch(93%_0.05_148)] text-[oklch(40%_0.17_148)]" : "bg-brand text-brand-foreground hover:bg-brand-dark"
                      )}
                    >
                      {copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                    </button>
                  </div>
                  <button onClick={() => generateCode.mutate({ projectId, workspaceId })} disabled={generateCode.isPending}
                    className="flex items-center gap-1.5 text-[11px] text-muted hover:text-foreground transition-colors">
                    <RefreshCw className={cn("w-3 h-3", generateCode.isPending && "animate-spin")} />
                    Generate new code
                  </button>
                </div>
              ) : (
                <button onClick={() => generateCode.mutate({ projectId, workspaceId })} disabled={generateCode.isPending}
                  className="w-full h-10 flex items-center justify-center gap-2 text-sm font-semibold bg-brand text-brand-foreground rounded-[8px] hover:bg-brand-dark transition-colors disabled:opacity-60">
                  {generateCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hash className="w-4 h-4" />}
                  Generate Invite Code
                </button>
              )}
            </div>
          )}

          {/* Add member from workspace — Owner only */}
          {canManage && addableMembers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground-2 mb-2">Add Member</p>
              <div className="space-y-1">
                {addableMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-[8px] hover:bg-surface-2 transition-colors">
                    <MemberAvatar name={m.user.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">{m.user.name}</p>
                      <p className="text-[10px] text-muted truncate">{m.user.email}</p>
                    </div>
                    <button onClick={() => addMember.mutate({ projectId, workspaceId, userId: m.user.id })}
                      disabled={addMember.isPending}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-brand-subtle text-brand border border-brand-muted hover:bg-brand/15 transition-colors flex-shrink-0">
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team list */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Users className="w-3.5 h-3.5 text-muted" />
              <p className="text-xs font-semibold text-foreground-2">Members ({projectMembers.length})</p>
            </div>

            <div className="space-y-1">
              {pmLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted" /></div>
              ) : projectMembers.length === 0 ? (
                <p className="text-[12px] text-muted text-center py-4">No members yet</p>
              ) : (
                projectMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-surface-2 transition-colors">
                    <MemberAvatar name={m.user.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[12px] font-medium text-foreground truncate">{m.user.name}</p>
                        {canManage ? (
                          <TagInput
                            value={m.tag ?? ""}
                            onChange={(tag) => updateTag.mutate({ projectId, workspaceId, userId: m.user.id, tag: tag || null })}
                          />
                        ) : m.tag ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-brand-subtle text-brand border border-brand-muted">
                            {m.tag}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-muted truncate">{m.user.email}</p>
                    </div>

                    {canManage ? (
                      <PermissionSelect
                        value={m.permission}
                        onChange={(perm) => updatePermission.mutate({ projectId, workspaceId, userId: m.user.id, permission: perm as "VIEWER" | "EDITOR" | "MANAGER" })}
                      />
                    ) : (
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md border flex-shrink-0", PERM_STYLE[m.permission])}>
                        {PERM_LABEL[m.permission]}
                      </span>
                    )}

                    {canManage && (
                      <button onClick={() => removeMember.mutate({ projectId, workspaceId, userId: m.user.id })}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-error hover:bg-[oklch(95%_0.03_27)] transition-colors flex-shrink-0">
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Owner note for non-owners */}
            {!canManage && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 px-1">
                <Crown className="w-3.5 h-3.5 text-[oklch(42%_0.2_278)] flex-shrink-0" />
                <span className="text-[11px] text-muted">Workspace owner manages membership and join codes</span>
              </div>
            )}

            {/* Permission legend — owner only (others don't need it) */}
            {canManage && (
              <div className="mt-3 pt-3 border-t border-border space-y-1">
                {Object.entries(PERM_DESC).map(([perm, desc]) => (
                  <div key={perm} className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md border w-20 text-center flex-shrink-0", PERM_STYLE[perm])}>
                      {PERM_LABEL[perm]}
                    </span>
                    <span className="text-[11px] text-muted">{desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberAvatar({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0">
      <span className="text-[11px] font-bold text-brand">{name.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

function PermissionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none h-7 pl-2 pr-6 text-[10px] font-semibold rounded-md border outline-none cursor-pointer transition-colors",
          PERM_STYLE[value],
          "bg-card hover:opacity-80"
        )}
      >
        {["VIEWER", "EDITOR", "MANAGER"].map((p) => (
          <option key={p} value={p}>{PERM_LABEL[p]}</option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
    </div>
  );
}

function TagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { setEditing(false); onChange(local.trim()); }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setLocal(value); setEditing(false); } }}
        maxLength={30}
        placeholder="Dev, Tester, PM..."
        className="w-20 text-[10px] border border-brand/40 rounded-md px-1.5 py-0.5 bg-card outline-none focus:border-brand/60 text-foreground"
      />
    );
  }

  return value ? (
    <button onClick={() => { setLocal(value); setEditing(true); }}
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-brand-subtle text-brand border border-brand-muted hover:opacity-80 transition-opacity">
      {value}
    </button>
  ) : (
    <button onClick={() => { setLocal(""); setEditing(true); }}
      className="text-[10px] text-muted border border-dashed border-border rounded-md px-1.5 py-0.5 hover:border-brand/40 hover:text-brand transition-colors">
      + tag
    </button>
  );
}
