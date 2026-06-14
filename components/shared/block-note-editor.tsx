"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type Block, type BlockType, BLOCK_OPTIONS, LIST_TYPES, TEXT_SHORTCUTS,
  parseMarkdown, serializeMarkdown, makeId,
} from "./block-note-editor-types";

const TYPE_CLASS: Record<BlockType, string> = {
  paragraph: "text-sm text-foreground",
  heading1: "text-lg font-bold text-foreground",
  heading2: "text-base font-bold text-foreground",
  heading3: "text-sm font-bold text-foreground",
  bulleted: "text-sm text-foreground",
  numbered: "text-sm text-foreground",
  todo: "text-sm text-foreground",
  quote: "text-sm text-foreground-2 italic",
};

const DEFAULT_WRAPPER = "w-full px-3 py-2 bg-surface border border-border rounded-[8px] focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/8 transition-all min-h-[88px]";

function numberFor(blocks: Block[], index: number): number {
  let n = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (blocks[i].type === "numbered") n++;
    else break;
  }
  return n;
}

export function BlockNoteEditor({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseMarkdown(value));
  const [slashMenu, setSlashMenu] = useState<{ blockId: string; query: string } | null>(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const focusTarget = useRef<string | null>(null);

  useEffect(() => {
    const id = focusTarget.current;
    if (!id) return;
    const el = inputRefs.current[id];
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    focusTarget.current = null;
  }, [blocks]);

  function commit(next: Block[]) {
    setBlocks(next);
    onChange(serializeMarkdown(next));
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    commit(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function insertAfter(index: number, type: BlockType) {
    const next: Block = { id: makeId(), type, text: "", checked: type === "todo" ? false : undefined };
    const copy = [...blocks];
    copy.splice(index + 1, 0, next);
    focusTarget.current = next.id;
    commit(copy);
  }

  function removeBlock(index: number) {
    const prev = blocks[index - 1];
    focusTarget.current = prev?.id ?? null;
    commit(blocks.filter((_, i) => i !== index));
  }

  function filteredOptions(query: string) {
    const q = query.toLowerCase();
    return BLOCK_OPTIONS.filter((o) => o.label.toLowerCase().includes(q) || o.type.includes(q));
  }

  function selectSlashOption(blockId: string, type: BlockType) {
    updateBlock(blockId, { type, text: "", checked: type === "todo" ? false : undefined });
    setSlashMenu(null);
    setMenuIndex(0);
    focusTarget.current = blockId;
  }

  function handleTextChange(block: Block, text: string) {
    if (text.startsWith("/")) {
      setSlashMenu({ blockId: block.id, query: text.slice(1) });
      setMenuIndex(0);
      updateBlock(block.id, { text });
      return;
    }
    if (slashMenu?.blockId === block.id) setSlashMenu(null);

    if (block.type === "paragraph") {
      const shortcut = TEXT_SHORTCUTS.find((s) => s.pattern.test(text));
      if (shortcut) {
        updateBlock(block.id, { type: shortcut.type, text: "", checked: shortcut.type === "todo" ? false : undefined });
        return;
      }
    }
    updateBlock(block.id, { text });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, block: Block, index: number) {
    if (slashMenu?.blockId === block.id) {
      const opts = filteredOptions(slashMenu.query);
      if (e.key === "ArrowDown") { e.preventDefault(); setMenuIndex((i) => Math.min(i + 1, opts.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMenuIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter") { e.preventDefault(); if (opts[menuIndex]) selectSlashOption(block.id, opts[menuIndex].type); return; }
      if (e.key === "Escape") { e.preventDefault(); setSlashMenu(null); return; }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (block.text === "" && block.type !== "paragraph") {
        updateBlock(block.id, { type: "paragraph", checked: undefined });
        return;
      }
      insertAfter(index, LIST_TYPES.includes(block.type) ? block.type : "paragraph");
      return;
    }

    if (e.key === "Backspace") {
      const input = e.currentTarget;
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        if (block.type !== "paragraph" && block.text !== "") {
          e.preventDefault();
          updateBlock(block.id, { type: "paragraph", checked: undefined });
          return;
        }
        if (block.text === "" && blocks.length > 1) {
          e.preventDefault();
          removeBlock(index);
        }
      }
    }
  }

  return (
    <div className={className ?? DEFAULT_WRAPPER}>
      {blocks.map((block, index) => (
        <div key={block.id} className="group relative flex items-start gap-1.5 py-0.5">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => insertAfter(index, "paragraph")}
            className="opacity-0 group-hover:opacity-100 w-4 h-4 mt-0.5 flex items-center justify-center text-muted-2 hover:text-muted transition-opacity flex-shrink-0 leading-none"
            aria-label="Add block below"
          >
            +
          </button>

          {block.type === "bulleted" && <span className="text-muted-2 select-none mt-0.5 flex-shrink-0 w-3 text-center">•</span>}
          {block.type === "numbered" && <span className="text-muted-2 select-none mt-0.5 flex-shrink-0 w-4 text-xs">{numberFor(blocks, index)}.</span>}
          {block.type === "todo" && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => updateBlock(block.id, { checked: !block.checked })}
              className={cn(
                "w-3.5 h-3.5 mt-1 rounded-[3px] border flex-shrink-0 flex items-center justify-center transition-colors",
                block.checked ? "bg-brand border-brand" : "border-border"
              )}
            >
              {block.checked && <span className="text-brand-foreground text-[9px] leading-none">✓</span>}
            </button>
          )}
          {block.type === "quote" && <span className="w-0.5 self-stretch bg-brand/40 flex-shrink-0 rounded-full" />}

          <input
            ref={(el) => { inputRefs.current[block.id] = el; }}
            value={block.text}
            onChange={(e) => handleTextChange(block, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, block, index)}
            onBlur={() => setSlashMenu((m) => (m?.blockId === block.id ? null : m))}
            placeholder={index === 0 && blocks.length === 1 ? placeholder ?? "Type '/' for commands..." : ""}
            className={cn(
              "flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted-2",
              TYPE_CLASS[block.type], block.checked && "line-through text-muted"
            )}
          />

          {slashMenu?.blockId === block.id && (
            <div className="absolute left-6 top-full mt-1 z-20 w-56 bg-card border border-border rounded-[8px] shadow-lg py-1 max-h-64 overflow-y-auto">
              {filteredOptions(slashMenu.query).length === 0 && (
                <div className="px-3 py-2 text-xs text-muted">No matches</div>
              )}
              {filteredOptions(slashMenu.query).map((opt, i) => (
                <button
                  key={opt.type}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSlashOption(block.id, opt.type)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left transition-colors",
                    i === menuIndex ? "bg-brand-subtle text-brand" : "text-foreground-2 hover:bg-surface-2"
                  )}
                >
                  <opt.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{opt.label}</span>
                  {opt.hint && <span className="text-xs text-muted-2 font-mono">{opt.hint}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
