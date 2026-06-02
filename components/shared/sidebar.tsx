"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Settings,
  ChevronRight, LogOut, Hash, UserCircle2, CalendarDays,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { CatIcon } from "./cat-icon";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { useSession, signOut } from "@/lib/auth/client";
import { destroyPusherClient } from "@/lib/pusher/client";
import { useTheme } from "./theme-provider";
import { useState, useCallback, useRef } from "react";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/calendar", icon: CalendarDays, label: "Calendar" },
];

type Project = { id: string; name: string; isOwned: boolean };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { sidebarSticky } = useTheme();
  const { data: currentWs } = useQuery(trpc.workspace.getCurrent.queryOptions());
  const { data: allProjects = [] } = useQuery(trpc.projects.listMine.queryOptions());

  const [ownedOrder, setOwnedOrder] = useState<string[] | null>(null);

  const userName = session?.user.name ?? "...";
  const userInitials = userName.slice(0, 2).toUpperCase();
  const workspaceName = currentWs?.workspace.name ?? "Workspace";
  const workspaceId = currentWs?.workspace.id ?? "";

  const rawOwned = allProjects.filter((p) => p.isOwned);
  const joinedProjects = allProjects.filter((p) => !p.isOwned);

  const ownedProjects: Project[] = ownedOrder
    ? ownedOrder.map((id) => rawOwned.find((p) => p.id === id)!).filter(Boolean)
    : rawOwned;

  const reorder = useMutation(trpc.projects.reorder.mutationOptions());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ownedProjects.findIndex((p) => p.id === active.id);
    const newIndex = ownedProjects.findIndex((p) => p.id === over.id);
    const newOrder = arrayMove(ownedProjects, oldIndex, newIndex);
    setOwnedOrder(newOrder.map((p) => p.id));
    reorder.mutate({ workspaceId, orderedIds: newOrder.map((p) => p.id) });
  }, [ownedProjects, workspaceId, reorder]);

  async function handleSignOut() {
    destroyPusherClient();
    await signOut();
    queryClient.clear();
    router.push("/login");
  }

  return (
    <>
      <aside className={cn(
          "group/sidebar flex-shrink-0 flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200 ease-out overflow-hidden",
          sidebarSticky ? "w-[228px] sidebar-sticky" : "w-14 hover:w-[228px]"
        )}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3.5 h-14 border-b border-sidebar-border flex-shrink-0">
          <div className="w-7 h-7 rounded-xl bg-brand flex items-center justify-center flex-shrink-0">
            <CatIcon className="w-4 h-4 text-brand-foreground" />
          </div>
          <span className="font-bold text-sidebar-foreground tracking-tight text-[15px] whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
            DobSpace
          </span>
        </div>

        {/* Workspace badge */}
        <div className="px-3 pt-3 pb-1 flex-shrink-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-surface border border-sidebar-border">
            <div className="w-4 h-4 rounded bg-brand/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-bold text-brand-light">{workspaceName[0]}</span>
            </div>
            <span className="text-xs text-sidebar-foreground font-medium truncate flex-1 whitespace-nowrap">{workspaceName}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 flex flex-col gap-0.5">
          <p className="px-2.5 py-1.5 text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
            Menu
          </p>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} title={item.label}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 min-w-0",
                  active ? "bg-sidebar-active text-sidebar-active-text" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("w-4 h-4 flex-shrink-0", active && "text-brand-light")} />
                <span className="flex-1 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">{item.label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-brand-light flex-shrink-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150" />}
              </Link>
            );
          })}

          <NotificationBell />

          {/* Owned projects (draggable) */}
          {ownedProjects.length > 0 && (
            <div className="pt-3">
              <p className="px-2.5 py-1.5 text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
                My Projects
              </p>
              <DndContext id="sidebar-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={ownedProjects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  {ownedProjects.map((project) => (
                    <SortableProjectLink
                      key={project.id}
                      project={project}
                      workspaceId={workspaceId}
                      pathname={pathname}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Joined projects (not draggable) */}
          {joinedProjects.length > 0 && (
            <div className="pt-3">
              <p className="px-2.5 py-1.5 text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
                Joined
              </p>
              {joinedProjects.map((project) => (
                <ProjectLink key={project.id} project={project} pathname={pathname} />
              ))}
            </div>
          )}

          <div className="flex-1" />
          <Link href="/settings" title="Settings"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150",
              pathname === "/settings" ? "bg-sidebar-active text-sidebar-active-text" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
            )}
          >
            <Settings className={cn("w-4 h-4 flex-shrink-0", pathname === "/settings" && "text-brand-light")} />
            <span className="flex-1 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">Settings</span>
          </Link>
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-3 pt-2 border-t border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sidebar-hover transition-colors">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-sidebar-border">
              {session?.user.image ? (
                <img src={session.user.image} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-sidebar-active flex items-center justify-center">
                  <span className="text-[11px] font-bold text-sidebar-active-text">{userInitials}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
              <p className="text-[12px] text-sidebar-foreground font-semibold truncate whitespace-nowrap leading-none">{userName}</p>
            </div>
            <button onClick={handleSignOut}
              className="w-6 h-6 rounded-md hover:bg-sidebar-border flex items-center justify-center transition-colors text-sidebar-muted hover:text-sidebar-foreground opacity-0 group-hover/sidebar:opacity-100 flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </aside>

    </>
  );
}

function SortableProjectLink({ project, pathname, workspaceId }: {
  project: Project; pathname: string; workspaceId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const active = pathname.startsWith(`/projects/${project.id}`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/item flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 min-w-0",
        active ? "bg-sidebar-active text-sidebar-active-text" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
      )}
    >
      <div className={cn("w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0", active ? "bg-brand/40" : "bg-sidebar-surface")}>
        <Hash className={cn("w-2.5 h-2.5", active ? "text-brand-light" : "text-sidebar-muted")} />
      </div>
      <ProjectNameCell project={project} workspaceId={workspaceId} />

      <div
        {...attributes}
        {...listeners}
        className={cn(
          "flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-grab active:cursor-grabbing",
          "opacity-0 group-hover/sidebar:group-hover/item:opacity-40 hover:!opacity-70",
          "text-sidebar-muted hover:bg-[oklch(25%_0.02_228)]"
        )}
        title="Drag to reorder"
      >
        <svg className="w-2.5 h-2.5" viewBox="0 0 8 14" fill="currentColor">
          <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/>
          <circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/>
          <circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/>
        </svg>
      </div>
    </div>
  );
}

function ProjectNameCell({ project, workspaceId }: { project: Project; workspaceId: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const rename = useMutation(trpc.projects.update.mutationOptions({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.projects.listMine.queryKey() }),
  }));

  function handleBlur() {
    setEditing(false);
    if (name.trim() && name.trim() !== project.name) {
      rename.mutate({ id: project.id, workspaceId, data: { name: name.trim() } });
    } else {
      setName(project.name);
    }
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (clickTimer.current) return;
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      router.push(`/projects/${project.id}`);
    }, 220);
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    setEditing(true);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setName(project.name); setEditing(false); } }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        maxLength={100}
        className="flex-1 min-w-0 bg-sidebar-surface border border-sidebar-border rounded-md px-1.5 py-0.5 text-[12px] text-sidebar-foreground outline-none focus:border-brand/50 whitespace-nowrap"
      />
    );
  }

  return (
    <span
      className="flex-1 truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 cursor-pointer select-none"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title="Click to open · Double-click to rename"
    >
      {project.name}
    </span>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ProjectLink({ project, pathname }: { project: Project; pathname: string }) {
  const active = pathname.startsWith(`/projects/${project.id}`);
  return (
    <Link href={`/projects/${project.id}`} title={project.name}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 group/item min-w-0",
        active ? "bg-sidebar-active text-sidebar-active-text" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
      )}
    >
      <div className={cn("w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0", active ? "bg-brand/40" : "bg-sidebar-surface")}>
        <UserCircle2 className={cn("w-2.5 h-2.5", active ? "text-brand-light" : "text-sidebar-muted")} />
      </div>
      <span className="flex-1 truncate whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">{project.name}</span>
      <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-0 group-hover/item:opacity-40 transition-opacity" />
    </Link>
  );
}
