"use client";

import { useEffect, useRef, useState } from "react";
import { Check, GripVertical, ListChecks, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Todo = { id: string; text: string; done: boolean };
type Filter = "all" | "active" | "done";

export function TodoListCard({ workspaceId }: { workspaceId: string }) {
  const storageKey = `dobspace.todos.${workspaceId}`;
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [dragId, setDragId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setTodos(JSON.parse(raw));
    } catch {
      // ignore malformed local storage
    }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(storageKey, JSON.stringify(todos));
  }, [todos, storageKey, loaded]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  function addTodo() {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setInput("");
  }

  function toggleTodo(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function startEdit(t: Todo) {
    setEditingId(t.id);
    setEditText(t.text);
  }

  function commitEdit() {
    const text = editText.trim();
    setTodos((prev) =>
      text
        ? prev.map((t) => (t.id === editingId ? { ...t, text } : t))
        : prev.filter((t) => t.id !== editingId)
    );
    setEditingId(null);
  }

  function handleDrop(targetId: string) {
    setTodos((prev) => {
      if (!dragId || dragId === targetId) return prev;
      const from = prev.findIndex((t) => t.id === dragId);
      const to = prev.findIndex((t) => t.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragId(null);
  }

  const activeCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;
  const canReorder = filter === "all";
  const visible = todos.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: todos.length },
    { id: "active", label: "Active", count: activeCount },
    { id: "done", label: "Done", count: doneCount },
  ];

  return (
    <div className="bg-card rounded-card border border-border p-4 shadow-[0_1px_4px_oklch(0%_0_0/4%)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5 text-muted" />
          <h2 className="text-[13px] font-semibold text-foreground">My To-Dos</h2>
        </div>
        {todos.length > 0 && (
          <div className="flex items-center gap-1">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "text-[11px] font-semibold px-2 py-1 rounded-full transition-colors",
                  filter === f.id ? "bg-brand text-brand-foreground" : "text-muted hover:bg-surface-2"
                )}
              >
                {f.label} {f.count}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTodo();
        }}
        className="flex items-center gap-2 mb-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a little task..."
          className="flex-1 text-[13px] px-3 py-2 rounded-full border border-border bg-surface-2 placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="Add to-do"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-brand text-brand-foreground hover:bg-brand-dark transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {!loaded ? null : visible.length === 0 ? (
        <p className="text-[13px] text-muted text-center py-6">
          {todos.length === 0 ? "Nothing here yet — add your first little task!" : "Nothing here."}
        </p>
      ) : (
        <ul className="space-y-1 max-h-[260px] overflow-y-auto pr-1 -mr-1">
          {visible.map((t) => (
            <li
              key={t.id}
              draggable={canReorder}
              onDragStart={() => setDragId(t.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(t.id)}
              onDragEnd={() => setDragId(null)}
              className={cn(
                "group flex items-center gap-1.5 px-1.5 py-1.5 rounded-btn hover:bg-surface-2 transition-colors",
                dragId === t.id && "opacity-40"
              )}
            >
              {canReorder && (
                <GripVertical className="w-3.5 h-3.5 text-muted-2 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0 cursor-grab" />
              )}

              <button
                type="button"
                onClick={() => toggleTodo(t.id)}
                aria-pressed={t.done}
                aria-label={t.done ? "Mark as not done" : "Mark as done"}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  t.done ? "bg-brand border-brand" : "border-border hover:border-brand"
                }`}
              >
                {t.done && <Check className="w-3 h-3 text-brand-foreground" strokeWidth={3} />}
              </button>

              {editingId === t.id ? (
                <input
                  ref={editInputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 text-[13px] px-1.5 py-0.5 rounded-md border border-brand bg-card focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className={`flex-1 text-left text-[13px] truncate ${
                    t.done ? "text-muted line-through" : "text-foreground"
                  }`}
                >
                  {t.text}
                </button>
              )}

              <button
                type="button"
                onClick={() => deleteTodo(t.id)}
                aria-label="Delete to-do"
                className="w-5 h-5 flex items-center justify-center rounded-full text-muted-2 opacity-0 group-hover:opacity-100 hover:text-error hover:bg-error/10 transition-all flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {doneCount > 0 && (
        <button
          type="button"
          onClick={() => setTodos((prev) => prev.filter((t) => !t.done))}
          className="w-full mt-3 pt-3 border-t border-border text-[12px] font-medium text-muted hover:text-brand transition-colors"
        >
          Clear {doneCount} completed
        </button>
      )}
    </div>
  );
}
