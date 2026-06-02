"use client";

import { useTheme } from "@/components/shared/theme-provider";

const S = 2; // 2px per pixel → 16×16px icons

const GRIDS: Record<string, { grid: number[][]; colors: Record<number, string> }> = {
  LOW: {
    grid: [
      [0,0,0,1,0,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    colors: { 1: "#4CAF7D" },
  },
  MEDIUM: {
    grid: [
      [0,0,0,1,0,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,0,0,0,0,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,1,1,1,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    colors: { 1: "#D4940A" },
  },
  HIGH: {
    grid: [
      [0,0,1,0,1,0,0,0],
      [0,1,1,1,1,1,0,0],
      [0,1,2,1,2,1,0,0],
      [1,1,1,2,1,1,1,0],
      [0,1,1,1,1,1,0,0],
      [0,0,1,2,1,0,0,0],
      [0,0,0,1,0,0,0,0],
      [0,0,0,0,0,0,0,0],
    ],
    colors: { 1: "#E84444", 2: "#F48024" },
  },
};

function PixelGrid({ grid, colors }: { grid: number[][]; colors: Record<number, string> }) {
  const W = grid[0]?.length ?? 0;
  const H = grid.length;
  return (
    <svg width={W * S} height={H * S} style={{ imageRendering: "pixelated", flexShrink: 0 }}>
      {grid.flatMap((row, y) =>
        row.map((cell, x) =>
          cell !== 0 ? (
            <rect key={`${x}-${y}`} x={x * S} y={y * S} width={S} height={S} fill={colors[cell]} />
          ) : null
        )
      )}
    </svg>
  );
}

export function PixelPriorityIcon({ priority }: { priority: string }) {
  const { accent } = useTheme();
  if (accent !== "kimmy") return null;
  const spec = GRIDS[priority];
  if (!spec) return null;
  return <PixelGrid grid={spec.grid} colors={spec.colors} />;
}
