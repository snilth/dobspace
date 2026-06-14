"use client";

import { useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { isSafeImageSrc } from "@/components/shared/avatar";
import { Pagination } from "./pagination";

type WorkloadEntry = { name: string; image: string | null; count: number };

type Member = {
  id: string;
  userId: string;
  user: { id: string; name: string; image: string | null };
  projects: { id: string; name: string; tag: string | null }[];
};

type Props = {
  workload: WorkloadEntry[];
  members: Member[];
  currentUserId?: string;
  ownerId: string;
};

const PAGE_SIZE = 5;

export function TeamCard({ workload, members, currentUserId, ownerId }: Props) {
  const [page, setPage] = useState(0);
  const maxCount = workload[0]?.count ?? 1;
  const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageMembers = members.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card rounded-card border-t-[3px] border-t-brand border-x border-b border-border shadow-[0_1px_4px_oklch(0%_0_0/4%)]">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border shrink-0">
        <div className="w-6 h-6 rounded-btn bg-brand-subtle text-brand flex items-center justify-center flex-shrink-0">
          <Users className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-[13px] font-semibold text-foreground">Team ({members.length})</h2>
      </div>

      <div className="p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
        {workload.length > 0 && (
          <div className="space-y-3 pb-4 border-b border-border shrink-0">
            <p className="text-xs font-semibold text-foreground-2">Workload</p>
            {workload.map((w) => {
              const pct = maxCount > 0 ? Math.round((w.count / maxCount) * 100) : 0;
              return (
                <div key={w.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {w.image
                          ? <img src={w.image} alt={w.name} className="w-full h-full object-cover" />
                          : <span className="text-[9px] font-bold text-brand">{w.name.slice(0, 2).toUpperCase()}</span>}
                      </div>
                      <span className="text-[12px] font-medium text-foreground">{w.name}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-muted">{w.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-brand-subtle overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex-1 min-h-0 flex flex-col overflow-hidden">
          <p className="text-xs font-semibold text-foreground-2 mb-2 shrink-0">Members</p>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 divide-y divide-border">
            {pageMembers.map((m) => {
              const isMe = m.userId === currentUserId;
              const isOwner = m.userId === ownerId;
              return (
                <div key={m.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                    {m.user.image && isSafeImageSrc(m.user.image)
                      ? <img src={m.user.image} alt={m.user.name} className="w-full h-full object-cover" />
                      : <span className="text-[11px] font-bold text-brand">{m.user.name.slice(0, 2).toUpperCase()}</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <p className="text-[13px] font-semibold text-foreground truncate">{m.user.name}</p>
                      {isMe && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-subtle text-brand border border-brand-muted shrink-0">
                          you
                        </span>
                      )}
                      {isOwner && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[oklch(95%_0.05_278)] text-[oklch(42%_0.2_278)] border border-[oklch(85%_0.08_278)] shrink-0 dark:bg-[oklch(22%_0.05_278)] dark:text-[oklch(72%_0.15_278)] dark:border-[oklch(32%_0.08_278)]">
                          owner
                        </span>
                      )}
                    </div>

                    {m.projects.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {m.projects.map((p) => (
                          <Link key={p.id} href={`/projects/${p.id}`}
                            className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-surface-2 hover:bg-brand-subtle hover:text-brand border border-border hover:border-brand-muted transition-colors group/proj">
                            <span className="text-[11px] font-medium text-foreground-2 group-hover/proj:text-brand truncate max-w-[90px]">{p.name}</span>
                            {p.tag && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-brand text-brand-foreground shrink-0">
                                {p.tag}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-2 italic">Not in any project</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        />
      </div>
    </div>
  );
}
