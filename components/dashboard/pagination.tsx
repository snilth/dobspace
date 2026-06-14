"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

export function Pagination({ page, totalPages, onPrev, onNext }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border shrink-0">
      <button
        type="button"
        onClick={onPrev}
        disabled={page === 0}
        aria-label="Previous page"
        className="w-6 h-6 flex items-center justify-center rounded-full border border-border text-muted hover:text-brand hover:border-brand/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="text-[11px] font-medium text-muted">
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page === totalPages - 1}
        aria-label="Next page"
        className="w-6 h-6 flex items-center justify-center rounded-full border border-border text-muted hover:text-brand hover:border-brand/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
