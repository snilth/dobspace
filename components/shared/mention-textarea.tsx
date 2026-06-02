"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; image?: string | null };

type Props = {
  value: string;
  onChange: (v: string) => void;
  members: Member[];
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
};

export function MentionTextarea({ value, onChange, members, placeholder, rows = 3, maxLength, className }: Props) {
  const [query, setQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);

    const cursor = e.target.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setQuery(match[1]);
      setMentionStart(cursor - match[0].length);
    } else {
      setQuery(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query !== null && filtered.length > 0 && (e.key === "Escape")) {
      setQuery(null);
    }
  }

  function insertMention(member: Member) {
    const textarea = ref.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const insertion = `@${member.name.split(" ")[0]} `;
    const newText = before + insertion + after;
    onChange(newText);
    setQuery(null);
    setTimeout(() => {
      if (ref.current) {
        const pos = before.length + insertion.length;
        ref.current.selectionStart = pos;
        ref.current.selectionEnd = pos;
        ref.current.focus();
      }
    }, 0);
  }

  const filtered = query !== null
    ? members.filter(m => m.name.toLowerCase().startsWith(query.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={cn(
          "w-full px-3 py-2.5 text-sm bg-surface border border-border rounded-[8px] outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/8 transition-all placeholder:text-muted-2 resize-none",
          className
        )}
      />
      {query !== null && (
        <div className="absolute z-50 bottom-full mb-1 left-0 min-w-[180px] bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider border-b border-border">
            Mention
          </p>
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-muted">No members found</p>
          ) : filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-2 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                {m.image
                  ? <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                  : <span className="text-[9px] font-bold text-brand">{m.name.slice(0, 2).toUpperCase()}</span>
                }
              </div>
              <span className="text-[13px] text-foreground">@{m.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
