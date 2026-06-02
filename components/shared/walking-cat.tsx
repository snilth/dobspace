"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/shared/theme-provider";

const P = 4;
const CAT_W = 10 * P;
const CAT_H = 13 * P;
const SPEED = 0.55;
const SLEEP_MIN = 22_000;
const SLEEP_MAX = 38_000;
const WAKE_MIN = 10_000;
const WAKE_MAX = 20_000;
const RANDOM_TALK_MIN = 45_000;
const RANDOM_TALK_MAX = 90_000;

const MESSAGES = [
  "A little reminder: you're loved. 🩷",
  "You're doing great, keep going!",
  "You've got this, babe! 💪",
  "You always do better than you think.",
  "Don't forget to drink water~ 🍵",
  "Proud of you so much! 💖",
  "Take a short break if you need one.",
  "I'm here cheering you on~",
  "Don't work too hard, sweetheart.",
  "Missing you already 🥺",
  "You're my favourite researcher 💻",
  "Remember to eat something! 🍱",
  "One step at a time, you're crushing it 🌟",
  "Snack break? 🍪",
  "I love you",
  "Muah muah",
  "Muahhhhhhhhh <3",
];

function randomMsg() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

const C: Record<number, string> = {
  1: "#FFDCDC",
  2: "#FAACBF",
  3: "#3D1F28",
  4: "#F472A0",
  5: "#FFCCD5",
};

const WALK_BASE: number[][] = [
  [0,0,1,1,0,0,1,1,0,0],
  [0,1,5,1,0,0,1,5,1,0],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,3,1,1,1,3,1,1,1],
  [1,1,1,1,4,4,1,1,1,1],
  [1,2,1,1,1,1,1,1,2,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,0],
];

const SLEEP_BASE: number[][] = [
  [0,0,1,1,0,0,1,1,0,0],
  [0,1,5,1,0,0,1,5,1,0],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,2,2,1,1,2,2,1,1],
  [1,1,1,1,4,4,1,1,1,1],
  [1,2,1,1,1,1,1,1,2,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,0],
];

const PET_BASE: number[][] = [
  [0,0,1,1,0,0,1,1,0,0],
  [0,1,5,1,0,0,1,5,1,0],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,3,3,1,1,1,3,3,1,1],
  [1,1,1,1,4,4,1,1,1,1],
  [1,2,2,1,1,1,1,2,2,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,1,0],
];

const WALK_LEGS: number[][][] = [
  [[0,1,2,0,0,0,1,2,0,0],[0,0,2,0,0,0,0,2,0,0]],
  [[0,0,1,2,0,0,1,2,0,0],[0,0,0,2,0,0,0,2,0,0]],
];
const SLEEP_LEGS: number[][] = [
  [0,1,1,1,0,0,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0],
];

type CatState = "walking" | "sleeping" | "petting";

function CatSprite({ rows, bobY }: { rows: number[][], bobY: number }) {
  return (
    <svg width={CAT_W} height={CAT_H} style={{ imageRendering: "pixelated", display: "block" }}>
      <g transform={`translate(0,${bobY})`}>
        {rows.flatMap((row, y) =>
          row.map((cell, x) =>
            cell !== 0 ? (
              <rect key={`${x}-${y}`} x={x * P} y={y * P} width={P} height={P} fill={C[cell]} />
            ) : null
          )
        )}
      </g>
    </svg>
  );
}

function ZzzBubble() {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ bottom: CAT_H, right: -6, width: 28, height: 36 }}
    >
      <span style={{
        position: "absolute", bottom: 0, right: 14,
        fontSize: 10, fontWeight: 900, color: "#FAACBF", fontFamily: "monospace",
        animation: "zzz-rise 2.4s ease-out infinite", animationDelay: "0s",
      }}>z</span>
      <span style={{
        position: "absolute", bottom: 4, right: 6,
        fontSize: 13, fontWeight: 900, color: "#F472A0", fontFamily: "monospace",
        animation: "zzz-rise 2.4s ease-out infinite", animationDelay: "0.8s",
      }}>Z</span>
      <span style={{
        position: "absolute", bottom: 10, right: 0,
        fontSize: 16, fontWeight: 900, color: "#FAACBF", fontFamily: "monospace",
        animation: "zzz-rise 2.4s ease-out infinite", animationDelay: "1.6s",
      }}>Z</span>
    </div>
  );
}

function SpeechBubble({ message, flip }: { message: string; flip: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: CAT_H + 12,
        left: "50%",
        transform: `translateX(-50%) scaleX(${flip ? -1 : 1})`,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <div style={{
        background: "rgba(255, 245, 248, 0.97)",
        border: "1.5px solid #FAACBF",
        borderRadius: 10,
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 700,
        color: "#9B3A5A",
        lineHeight: 1.4,
        boxShadow: "0 2px 8px rgba(220,100,140,0.15)",
        position: "relative",
      }}>
        {message}
        <div style={{
          position: "absolute",
          bottom: -6,
          left: "50%",
          marginLeft: -5,
          width: 9,
          height: 9,
          background: "rgba(255,245,250,0.97)",
          border: "1.5px solid #FAACBF",
          borderTop: "none",
          borderLeft: "none",
          transform: "rotate(45deg)",
        }} />
      </div>
    </div>
  );
}

export function WalkingCat() {
  const { accent } = useTheme();
  const [catState, setCatState] = useState<CatState>("sleeping");
  const [frame, setFrame] = useState(0);
  const [bobY, setBobY] = useState(0);
  const [bubble, setBubble] = useState<{ message: string; flip: boolean } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<CatState>("sleeping");
  const dirRef = useRef<1 | -1>(1);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const talkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBubble = useCallback((message: string, duration = 2200) => {
    const flip = dirRef.current === -1;
    setBubble({ message, flip });
    setTimeout(() => setBubble(null), duration);
  }, []);

  const scheduleRandomTalk = useCallback(() => {
    if (talkTimerRef.current) clearTimeout(talkTimerRef.current);
    const delay = RANDOM_TALK_MIN + Math.random() * (RANDOM_TALK_MAX - RANDOM_TALK_MIN);
    talkTimerRef.current = setTimeout(() => {
      if (stateRef.current === "walking") showBubble(randomMsg(), 2500);
      scheduleRandomTalk();
    }, delay);
  }, [showBubble]);

  const startWalking = useCallback(() => {
    stateRef.current = "walking";
    setCatState("walking");

    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    const sleepDelay = SLEEP_MIN + Math.random() * (SLEEP_MAX - SLEEP_MIN);
    sleepTimerRef.current = setTimeout(() => {
      stateRef.current = "sleeping";
      setCatState("sleeping");

      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
      const wakeDelay = WAKE_MIN + Math.random() * (WAKE_MAX - WAKE_MIN);
      wakeTimerRef.current = setTimeout(() => startWalking(), wakeDelay);
    }, sleepDelay);

    scheduleRandomTalk();
  }, [scheduleRandomTalk]);

  const handlePet = useCallback(() => {
    if (stateRef.current === "petting") return;
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current);
    if (talkTimerRef.current) clearTimeout(talkTimerRef.current);

    stateRef.current = "petting";
    setCatState("petting");
    showBubble(randomMsg());

    setTimeout(() => startWalking(), 2200);
  }, [startWalking, showBubble]);

  useEffect(() => {
    if (accent !== "kimmy") return;
    let x = window.innerWidth / 2 - CAT_W / 2;
    let dir: 1 | -1 = 1;
    let lastTime = 0;
    let rafId: number;

    function tick(time: number) {
      if (lastTime === 0) lastTime = time;
      const dt = Math.min(time - lastTime, 50);
      lastTime = time;

      if (stateRef.current === "walking") {
        const maxX = window.innerWidth - CAT_W;
        x += dir * SPEED * (dt / 16);
        if (x >= maxX) { x = maxX; dir = -1; }
        else if (x <= 0) { x = 0; dir = 1; }
        dirRef.current = dir;

        const el = wrapRef.current;
        if (el) {
          el.style.left = `${x}px`;
          el.style.transform = dir === -1 ? "scaleX(-1)" : "scaleX(1)";
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    // position cat at center on mount
    const el = wrapRef.current;
    if (el) el.style.left = `${x}px`;

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [accent]);

  useEffect(() => {
    if (accent !== "kimmy") return;
    const id = setInterval(() => {
      if (stateRef.current !== "walking") return;
      setFrame(f => {
        const next = (f + 1) % 2;
        setBobY(next === 1 ? 1 : 0);
        return next;
      });
    }, 260);
    return () => clearInterval(id);
  }, [accent]);

  if (accent !== "kimmy") return null;

  const base = catState === "sleeping" ? SLEEP_BASE : catState === "petting" ? PET_BASE : WALK_BASE;
  const legs = catState === "sleeping" ? SLEEP_LEGS : WALK_LEGS[frame];
  const bob = catState === "walking" ? bobY : 0;

  return (
    <div
      ref={wrapRef}
      className="fixed bottom-0 z-[100] select-none cursor-pointer"
      style={{ left: -CAT_W }}
      onClick={handlePet}
      title={catState === "sleeping" ? "Wake me up! 🐱" : "Pet me! 🐱"}
    >
      {catState === "sleeping" && <ZzzBubble />}
      {bubble && <SpeechBubble message={bubble.message} flip={bubble.flip} />}
      <CatSprite rows={[...base, ...legs]} bobY={bob} />
    </div>
  );
}
