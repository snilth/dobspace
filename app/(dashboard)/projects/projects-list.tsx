"use client";

import { useState, useRef } from "react";
import { FolderKanban, Plus, Clock, Check, X, LayoutGrid, Hash, Trash2, Loader2, ImagePlus, Pencil, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { JoinByCodeModal } from "@/components/shared/join-by-code-modal";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  isOwned?: boolean;
  _count: { tasks: number };
};

type Props = {
  workspaceId: string;
  isOwner: boolean;
  initialProjects: Project[];
};

const COVER_COLORS = [
  "from-[oklch(55%_0.22_278)] to-[oklch(42%_0.2_300)]",   // indigo-violet
  "from-[oklch(52%_0.19_148)] to-[oklch(42%_0.18_170)]",  // emerald
  "from-[oklch(55%_0.22_228)] to-[oklch(44%_0.2_248)]",   // blue
  "from-[oklch(57%_0.22_345)] to-[oklch(46%_0.2_20)]",    // pink-red
  "from-[oklch(60%_0.19_55)] to-[oklch(50%_0.18_35)]",    // amber
  "from-[oklch(52%_0.21_27)] to-[oklch(42%_0.19_10)]",    // red-orange
  "from-[oklch(54%_0.2_195)] to-[oklch(44%_0.18_215)]",   // teal-cyan
  "from-[oklch(50%_0.2_320)] to-[oklch(42%_0.18_300)]",   // purple
  "from-[oklch(56%_0.18_170)] to-[oklch(46%_0.16_148)]",  // green
  "from-[oklch(53%_0.21_250)] to-[oklch(43%_0.19_270)]",  // blue-indigo
];

function getCoverColor(id: string) {
  // Hash over all chars of the ID for better distribution
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return COVER_COLORS[hash % COVER_COLORS.length];
}

export function ProjectsList({ workspaceId, isOwner, initialProjects }: Props) {
  const [joinOpen, setJoinOpen] = useState(false);
  const [projects, setProjects] = useState(initialProjects);

  const myProjects = projects.filter(p => p.isOwned);
  const joinedProjects = projects.filter(p => !p.isOwned);

  function handleProjectUpdated(updated: Project) {
    setProjects(prev => prev.map(p => p.id === updated.id ? { ...updated, isOwned: p.isOwned } : p));
  }

  function handleProjectDeleted(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id));
  }

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
            <span className="font-medium text-foreground-2">{projects.length}</span> projects
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

      {projects.length === 0 ? (
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
        <div className="space-y-8">
          {myProjects.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">
                My Projects · {myProjects.length}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myProjects.map(p => (
                  <ProjectCard key={p.id} project={p} workspaceId={workspaceId} isOwner={true}
                    onUpdated={handleProjectUpdated} onDeleted={handleProjectDeleted} />
                ))}
              </div>
            </section>
          )}
          {joinedProjects.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">
                Joined · {joinedProjects.length}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {joinedProjects.map(p => (
                  <ProjectCard key={p.id} project={p} workspaceId={workspaceId} isOwner={false}
                    onUpdated={handleProjectUpdated} onDeleted={handleProjectDeleted} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {joinOpen && <JoinByCodeModal onClose={() => setJoinOpen(false)} />}
    </div>
  );
}

function ProjectCard({ project, workspaceId, isOwner, onUpdated, onDeleted }: {
  project: Project; workspaceId: string; isOwner: boolean;
  onUpdated: (p: Project) => void; onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [image, setImage] = useState<string | null>(project.image ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const update = useMutation(trpc.projects.update.mutationOptions({
    onSuccess: () => {
      onUpdated({ ...project, name: name.trim(), description: description.trim() || null, image });
      queryClient.invalidateQueries({ queryKey: trpc.projects.listMine.queryKey() });
      setEditing(false);
    },
  }));

  const deleteProject = useMutation(trpc.projects.delete.mutationOptions({
    onSuccess: () => {
      onDeleted(project.id);
      queryClient.invalidateQueries({ queryKey: trpc.projects.listMine.queryKey() });
      setConfirmDelete(false);
    },
  }));

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 200;
        const ctx = canvas.getContext("2d")!;
        const scale = Math.max(600 / img.width, 200 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (600 - w) / 2, (200 - h) / 2, w, h);
        setImage(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleSave() {
    if (!name.trim()) return;
    update.mutate({
      id: project.id,
      workspaceId,
      data: { name: name.trim(), description: description.trim() || undefined, image: image ?? null },
    });
  }

  function handleCancel() {
    setName(project.name);
    setDescription(project.description ?? "");
    setImage(project.image ?? null);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col rounded-[14px] border border-brand/40 bg-card shadow-[0_0_0_3px_oklch(65%_0.18_228/8%)] overflow-hidden">
        {/* Cover image editor */}
        <div
          className={cn(
            "relative h-28 flex items-center justify-center cursor-pointer group/cover",
            !image && `bg-gradient-to-br ${getCoverColor(project.id)}`
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-black text-white/60 select-none">{(name || project.name)[0]?.toUpperCase()}</span>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <ImagePlus className="w-5 h-5 text-white" />
            <span className="text-white text-[12px] font-semibold">{image ? "Change cover" : "Add cover"}</span>
          </div>
          {image && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setImage(null); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
        </div>

        <div className="p-4 space-y-2.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
            maxLength={100}
            placeholder="Project name"
            className="w-full text-[13px] font-semibold bg-transparent border-b border-border pb-1.5 outline-none focus:border-brand/60 text-foreground placeholder:text-muted"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Description (optional)"
            className="w-full text-[11px] bg-transparent border border-border rounded-[6px] px-2 py-1.5 outline-none focus:border-brand/40 text-muted resize-none placeholder:text-muted-2"
          />
          <div className="flex items-center gap-2 justify-end pt-1">
            <button onClick={handleCancel} className="flex items-center gap-1 px-2.5 h-7 text-[11px] font-medium rounded-[6px] border border-border text-muted hover:bg-surface-2 transition-colors">
              <X className="w-3 h-3" />Cancel
            </button>
            <button onClick={handleSave} disabled={!name.trim() || update.isPending}
              className="flex items-center gap-1 px-2.5 h-7 text-[11px] font-semibold rounded-[6px] bg-brand text-brand-foreground hover:bg-brand-dark transition-colors disabled:opacity-50">
              {update.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col rounded-[14px] border border-border bg-card hover:border-brand/30 hover:shadow-[0_6px_20px_-4px_oklch(0%_0_0/12%)] transition-all overflow-hidden">

      {/* Cover */}
      <Link href={`/projects/${project.id}`} className="block">
        <div className={cn(
          "relative h-28 flex items-center justify-center overflow-hidden",
          !project.image && `bg-gradient-to-br ${getCoverColor(project.id)}`
        )}>
          {project.image ? (
            <img src={project.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <span className="text-5xl font-black text-white/25 select-none group-hover:scale-110 transition-transform duration-300">
              {project.name[0]?.toUpperCase()}
            </span>
          )}
        </div>
      </Link>

      {/* Owner actions */}
      {isOwner && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button onClick={() => setEditing(true)}
            className="w-7 h-7 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            title="Edit project">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="w-7 h-7 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-error/80 transition-colors"
            title="Delete project">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
          <div className="w-full max-w-sm bg-card rounded-[16px] border border-border shadow-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-[oklch(93%_0.04_27)] flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-error" />
            </div>
            <h2 className="text-[15px] font-bold text-foreground mb-1">Delete "{project.name}"?</h2>
            <p className="text-[13px] text-muted mb-5">All tasks, epics, and data will be permanently deleted and cannot be recovered.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 h-9 border border-border rounded-[8px] text-sm font-medium text-foreground-2 hover:bg-surface-2 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => deleteProject.mutate({ id: project.id, workspaceId })}
                disabled={deleteProject.isPending}
                className="flex-1 h-9 bg-error text-white rounded-[8px] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-1.5">
                {deleteProject.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <Link href={`/projects/${project.id}`} className="flex flex-col flex-1 p-4">
        <p className="text-[14px] font-semibold text-foreground group-hover:text-brand transition-colors mb-1 truncate">
          {project.name}
        </p>
        <p className={cn("text-[12px] leading-relaxed line-clamp-2 flex-1", project.description ? "text-muted" : "text-muted-2 italic")}>
          {project.description || "No description"}
        </p>
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
          <Clock className="w-3 h-3 text-muted" />
          <span className="text-[11px] text-muted">{project._count.tasks} tasks</span>
        </div>
      </Link>
    </div>
  );
}
