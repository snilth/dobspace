"use client";

import { useState } from "react";
import { Hash } from "lucide-react";
import { JoinByCodeModal } from "./join-by-code-modal";

export function JoinCodeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3.5 py-2 border border-border bg-card text-foreground-2 text-sm font-semibold rounded-[8px] hover:bg-surface-2 hover:border-brand/30 hover:text-brand transition-colors"
      >
        <Hash className="w-4 h-4" />
        Join by Code
      </button>
      {open && <JoinByCodeModal onClose={() => setOpen(false)} />}
    </>
  );
}
