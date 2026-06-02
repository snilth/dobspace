"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { Loader2 } from "lucide-react";

export function SprintBurndown({ sprintId }: { sprintId: string }) {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.sprint.burndown.queryOptions({ sprintId }));

  if (isLoading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted" />
      </div>
    );
  }

  if (!data || data.days.length === 0) {
    return <p className="text-[13px] text-muted italic">No burndown data yet.</p>;
  }

  const { days, total } = data;
  const w = 600;
  const h = 160;
  const pad = { top: 12, right: 16, bottom: 28, left: 32 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const xStep = days.length > 1 ? chartW / (days.length - 1) : chartW;
  const yScale = (v: number) => chartH - (v / Math.max(total, 1)) * chartH;

  const pts = (key: "remaining" | "ideal") =>
    days.map((d, i) => `${pad.left + i * xStep},${pad.top + yScale(d[key])}`).join(" ");

  return (
    <div className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 280 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = pad.top + frac * chartH;
          const val = Math.round(total * (1 - frac));
          return (
            <g key={frac}>
              <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y} stroke="oklch(88% 0 0)" strokeWidth={0.5} />
              <text x={pad.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="oklch(60% 0 0)">{val}</text>
            </g>
          );
        })}

        {/* Ideal line */}
        <polyline points={pts("ideal")} fill="none" stroke="oklch(70% 0 0)" strokeWidth={1.5} strokeDasharray="4 3" />

        {/* Actual line */}
        <polyline points={pts("remaining")} fill="none" stroke="oklch(52% 0.22 228)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {days.map((d, i) => (
          <circle key={i} cx={pad.left + i * xStep} cy={pad.top + yScale(d.remaining)} r={3} fill="oklch(52% 0.22 228)" />
        ))}

        {/* X-axis labels (show ~5 evenly) */}
        {days.filter((_, i) => i === 0 || i === days.length - 1 || i % Math.ceil(days.length / 5) === 0).map((d, _, arr) => {
          const i = days.indexOf(d);
          return (
            <text key={d.date} x={pad.left + i * xStep} y={h - 6} textAnchor="middle" fontSize={9} fill="oklch(60% 0 0)">
              {d.date.slice(5)}
            </text>
          );
        })}
      </svg>

      <div className="flex items-center gap-4 mt-2 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[oklch(52%_0.22_228)] rounded" />
          <span className="text-[11px] text-muted">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[oklch(70%_0_0)] rounded" style={{ borderTop: "1.5px dashed oklch(70% 0 0)" }} />
          <span className="text-[11px] text-muted">Ideal</span>
        </div>
      </div>
    </div>
  );
}
