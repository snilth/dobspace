"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { CatIcon } from "@/components/shared/cat-icon";

import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

export function ChatPanel({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi 👋 I'm DobSpace AI — ask me anything about your workspace.\n\nTry: *\"What tasks are overdue?\"* or *\"What's due this week?\"*",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", isStreaming: true };

    const history = [...messages, userMsg]
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, messages: history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: errText || "Something went wrong", isStreaming: false } : m)
        );
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw) as { text?: string; error?: string };
            if (parsed.error) {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: parsed.error!, isStreaming: false } : m)
              );
              return;
            }
            if (parsed.text) {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: m.content + parsed.text! } : m)
              );
            }
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: "Something went wrong. Try again.", isStreaming: false } : m)
        );
      }
    } finally {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m));
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Open button — only shown when closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 h-10 rounded-xl bg-brand text-brand-foreground shadow-lg hover:bg-brand-dark transition-colors text-[13px] font-semibold"
        >
          <CatIcon className="w-3.5 h-3.5" />
          DobSpace AI
        </button>
      )}

      {/* Chat box */}
      {open && (
        <div className="w-[340px] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "480px" }}>

          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 h-[52px] border-b border-border flex-shrink-0 bg-surface-2/60">
            <div className="w-7 h-7 rounded-xl bg-brand flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-brand-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground leading-none mb-0.5">DobSpace AI</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <p className="text-[10px] text-muted">Online</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-2", msg.role === "user" && "justify-end")}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-xl bg-brand-subtle border border-brand-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-brand" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                  msg.role === "user"
                    ? "bg-brand text-brand-foreground rounded-tr-md"
                    : "bg-surface-2 text-foreground rounded-tl-md border border-border"
                )}>
                  <MarkdownText text={msg.content} />
                  {msg.isStreaming && (
                    <span className="inline-flex gap-0.5 ml-1 items-end">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1 h-1 rounded-full bg-current opacity-60 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3.5 py-3 border-t border-border flex-shrink-0 bg-surface-2/40">
            <div className="flex items-end gap-2 bg-card border border-border rounded-xl p-2 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/8 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder="Ask about your workspace..."
                rows={1}
                maxLength={2000}
                className="flex-1 resize-none text-[13px] bg-transparent outline-none placeholder:text-muted-2 min-h-[24px] max-h-[100px] leading-relaxed"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="w-7 h-7 bg-brand text-brand-foreground rounded-lg flex items-center justify-center disabled:opacity-35 hover:bg-brand-dark transition-colors flex-shrink-0"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i} className="italic opacity-80">{part.slice(1, -1)}</em>;
        return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
      })}
    </>
  );
}
