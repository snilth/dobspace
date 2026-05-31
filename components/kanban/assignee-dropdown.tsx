"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  name: string;
  image?: string | null;
  tag?: string | null;
};

type Props = {
  members: Member[];
  selectedIds: string[];
  onToggle: (userId: string) => void;
  disabled?: boolean;
};

export function AssigneeDropdown({ members, selectedIds, onToggle, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = members.filter(m => selectedIds.includes(m.id));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full h-10 px-3 flex items-center gap-2 bg-surface border border-border rounded-[8px] hover:border-brand/40 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selected.length === 0 ? (
          <>
            <UserCircle2 className="w-5 h-5 text-muted-2 flex-shrink-0" />
            <span className="flex-1 text-sm text-muted-2">Unassigned</span>
          </>
        ) : (
          <>
            {/* Avatar stack */}
            <div className="flex -space-x-1.5 flex-shrink-0">
              {selected.slice(0, 3).map(m => (
                <div key={m.id} className="w-6 h-6 rounded-full border-2 border-card overflow-hidden flex-shrink-0">
                  {m.image ? (
                    <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-brand-subtle flex items-center justify-center">
                      <span className="text-[8px] font-bold text-brand">{m.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate leading-none">
                {selected.length === 1 ? selected[0].name : `${selected.length} assignees`}
              </p>
              {selected.length === 1 && selected[0].tag && (
                <p className="text-[10px] text-muted mt-0.5 truncate">{selected[0].tag}</p>
              )}
            </div>
          </>
        )}
        <ChevronDown className={cn("w-4 h-4 text-muted flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-[10px] shadow-lg z-20 overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {members.length === 0 ? (
              <p className="text-[12px] text-muted text-center py-4">No members in this project</p>
            ) : (
              members.map(m => {
                const isSelected = selectedIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onToggle(m.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-2 transition-colors text-left",
                      isSelected && "bg-brand-subtle/40"
                    )}
                  >
                    <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden relative">
                      {m.image ? (
                        <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-brand-subtle border border-brand-muted flex items-center justify-center">
                          <span className="text-[9px] font-bold text-brand">{m.name.slice(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-brand/80 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[13px] truncate leading-none", isSelected ? "font-semibold text-foreground" : "text-foreground")}>
                        {m.name}
                      </p>
                      {m.tag && (
                        <p className="text-[10px] text-muted mt-0.5 truncate">{m.tag}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
