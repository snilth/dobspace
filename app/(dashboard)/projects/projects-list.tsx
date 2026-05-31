"use client";

import { useState } from "react";
import { FolderKanban, Plus, Clock, Pencil, Check, X, LayoutGrid, Hash, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { JoinByCodeModal } from "@/components/shared/join-by-code-modal";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  _count: { tasks: number };
  sprints: { name: string; status: string }[];
};

type Props = {
  workspaceId: string;
  isOwner: boolean;
  initialProjects: Project[];
};

export function ProjectsList({ workspaceId, isOwner, initialProjects }: Props) {
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-xs font-medium text-muted mb-1 flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" />
            Projects
          </p>
          <h1 className="text-[22px] font-bold text-foreground leading-none">All Projects</h1>
          <p className="text-sm text-muted mt-1.5">
            <span className="font-medium text-foreground-2">{initialProjects.length}</span> projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setJoinOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-border bg-card text-foreground-2 text-sm font-semibold rounded-[8px] hover:bg-surface-2 hover:border-brand/30 hover:text-brand transition-colors"
          >
            <Hash className="w-4 h-4" />
            Join by Code
          </button>
          {isOwner && (
            <Link
              href="/projects/new"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand text-brand-foreground text-sm font-semibold rounded-[8px] hover:bg-brand-dark transition-all shadow-sm shadow-brand/20"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          )}
        </div>
      </div>

      {initialProjects.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center bg-card rounded-[16px] border border-dashed border-border">
          <div className="w-12 h-12 rounded-2xl bg-brand-subtle flex items-center justify-center mb-3">
            <FolderKanban className="w-6 h-6 text-brand" />
          </div>
          <p className="text-[13px] font-semibold text-foreground mb-1">No projects yet</p>
          <p className="text-xs text-muted">
            {isOwner
              ? "Create your first project to get started"
              : "Ask the workspace owner to create a project, or join one with a code"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {initialProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              workspaceId={workspaceId}
              isOwner={isOwner}
            />
          ))}
        </div>
      )}

      {joinOpen && <JoinByCodeModal onClose={() => setJoinOpen(false)} />}
    </div>
  );
}

function ProjectCard({ project, workspaceId, isOwner }: { project: Project; workspaceId: string; isOwner: boolean }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const activeSprint = project.sprints.find((s) => s.status === "ACTIVE");

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const update = useMutation(trpc.projects.update.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.projects.listMine.queryKey() });
      setEditing(false);
    },
  }));

  const deleteProject = useMutation(trpc.projects.delete.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.projects.listMine.queryKey() });
      router.refresh();
    },
  }));

  function handleSave() {
    if (!name.trim()) return;
    update.mutate({ id: project.id, workspaceId, data: { name: name.trim(), description: description.trim() || undefined } });
  }

  function handleCancel() {
    setName(project.name);
    setDescription(project.description ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col p-4 rounded-[12px] border border-brand/40 bg-card shadow-[0_0_0_3px_oklch(65%_0.18_228/8%)]">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
          maxLength={100}
          placeholder="Project name"
          className="w-full text-[13px] font-semibold bg-transparent border-b border-border pb-1.5 mb-2 outline-none focus:border-brand/60 text-foreground placeholder:text-muted"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Description (optional)"
          className="w-full text-[11px] bg-transparent border border-border rounded-[6px] px-2 py-1.5 outline-none focus:border-brand/40 text-muted resize-none mb-3 placeholder:text-muted-2"
        />
        <div className="flex items-center gap-2 justify-end">
          <button onClick={handleCancel} className="flex items-center gap-1 px-2.5 h-7 text-[11px] font-medium rounded-[6px] border border-border text-muted hover:bg-surface-2 transition-colors">
            <X className="w-3 h-3" />Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim() || update.isPending}
            className="flex items-center gap-1 px-2.5 h-7 text-[11px] font-semibold rounded-[6px] bg-brand text-brand-foreground hover:bg-brand-dark transition-colors disabled:opacity-50">
            {update.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col p-4 rounded-[12px] border border-border bg-card hover:border-brand/30 hover:shadow-[0_4px_16px_-4px_oklch(0%_0_0/10%)] transition-all">

      {/* Owner actions */}
      {isOwner && (
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            title="Edit project">
            <Pencil className="w-3 h-3" />
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-error hover:bg-[oklch(95%_0.03_27)] transition-colors"
              title="Delete project">
              <Trash2 className="w-3 h-3" />
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-card border border-[oklch(88%_0.06_27)] rounded-[8px] px-2 h-7 shadow-sm">
              <span className="text-[10px] text-error font-semibold whitespace-nowrap">Delete?</span>
              <button onClick={() => deleteProject.mutate({ id: project.id, workspaceId })}
                disabled={deleteProject.isPending}
                className="text-[10px] font-bold text-error hover:underline disabled:opacity-50">
                {deleteProject.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Yes"}
              </button>
              <span className="text-muted text-[10px]">/</span>
              <button onClick={() => setConfirmDelete(false)} className="text-[10px] font-medium text-muted hover:text-foreground">No</button>
            </div>
          )}
        </div>
      )}

      <Link href={`/projects/${project.id}`} className="flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-[10px] bg-brand-subtle flex items-center justify-center flex-shrink-0 group-hover:bg-brand/15 transition-colors">
            <span className="text-base font-bold text-brand">{project.name[0]}</span>
          </div>
          <div className="flex-1 min-w-0 pt-0.5 pr-14">
            <p className="text-[13px] font-semibold text-foreground group-hover:text-brand transition-colors truncate">
              {project.name}
            </p>
          </div>
        </div>

        {/* Description — always visible */}
        <p className={cn("text-[11px] mb-3 leading-relaxed line-clamp-2 min-h-[2.5em]", project.description ? "text-muted" : "text-muted-2 italic")}>
          {project.description || "No description"}
        </p>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
          <div className="flex items-center gap-1 text-[11px] text-muted">
            <Clock className="w-3 h-3" />
            {project._count.tasks} tasks
          </div>
          {activeSprint ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[oklch(93%_0.05_148)] text-[oklch(40%_0.17_148)]">
              {activeSprint.name}
            </span>
          ) : (
            <span className="text-[10px] text-muted-2">No Sprint</span>
          )}
        </div>
      </Link>
    </div>
  );
}
