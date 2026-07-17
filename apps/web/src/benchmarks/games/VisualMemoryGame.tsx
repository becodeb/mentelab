"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VisualMemoryConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";

function gridSizeFor(level: number): number {
  if (level <= 2) return 3;
  if (level <= 5) return 4;
  if (level <= 9) return 5;
  return 6;
}

type Phase = "showing" | "input" | "levelDone";

export function VisualMemoryGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as VisualMemoryConfig;
  const [level, setLevel] = useState(cfg.startLevel);
  const [lives, setLives] = useState(cfg.lives);
  const [pattern, setPattern] = useState<Set<number>>(new Set());
  const [found, setFound] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>("showing");
  const lastClickAtRef = useRef(0);
  const wrongInLevelRef = useRef(0);
  const finishingRef = useRef(false);

  const grid = gridSizeFor(level);
  const cells = grid * grid;
  const tileCount = level + 2;

  const showPattern = useCallback(
    (lvl: number) => {
      const g = gridSizeFor(lvl);
      const total = g * g;
      const chosen = new Set<number>();
      while (chosen.size < Math.min(lvl + 2, total - 1)) {
        chosen.add(Math.floor(Math.random() * total));
      }
      setPattern(chosen);
      setFound(new Set());
      setWrong(new Set());
      wrongInLevelRef.current = 0;
      setPhase("showing");
      emit("pattern_shown", { level: lvl, gridSize: g, tiles: [...chosen] });
      setTimeout(() => {
        setPhase("input");
        lastClickAtRef.current = now();
      }, cfg.showMs);
    },
    [cfg.showMs, emit, now],
  );

  useEffect(() => {
    showPattern(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const clickTile = (i: number) => {
    if (phase !== "input" || found.has(i) || wrong.has(i) || finishingRef.current) return;
    const latencyMs = Math.round(now() - lastClickAtRef.current);
    lastClickAtRef.current = now();
    const correct = pattern.has(i);
    emit("tile_click", { level, index: i, correct, latencyMs });
    if (correct) {
      const nf = new Set(found).add(i);
      setFound(nf);
      if (nf.size >= pattern.size) {
        emit("level_complete", { level });
        setPhase("levelDone");
        setTimeout(() => setLevel((l) => l + 1), 800);
      }
    } else {
      setWrong(new Set(wrong).add(i));
      wrongInLevelRef.current++;
      if (wrongInLevelRef.current >= 3) {
        emit("life_lost", { level, livesLeft: lives - 1 });
        if (lives - 1 <= 0) {
          finishingRef.current = true;
          setTimeout(finish, 400);
        } else {
          setLives(lives - 1);
          showPattern(level); // mismo nivel, patrón nuevo
        }
      }
    }
  };

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-cream-50 p-6">
      <div className="flex gap-6 text-sm font-black uppercase tracking-widest text-emerald-300">
        <span>nivel {level}</span>
        <span>{"❤️".repeat(Math.max(0, lives))}</span>
      </div>
      <p className="mt-1 h-7 text-lg font-black text-emerald-600">
        {phase === "showing" && `👀 Memorizá las ${tileCount} casillas`}
        {phase === "input" && "✋ ¿Cuáles se iluminaron?"}
        {phase === "levelDone" && "🎉 ¡Genial!"}
      </p>
      <div
        className="mt-6 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${grid}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cells }, (_, i) => {
          const lit = phase === "showing" && pattern.has(i);
          const isFound = found.has(i);
          const isWrong = wrong.has(i);
          return (
            <button
              key={i}
              onPointerDown={() => clickTile(i)}
              className={`aspect-square w-16 rounded-2xl transition-all duration-150 sm:w-20 ${
                lit || isFound
                  ? "scale-105 bg-emerald-500 shadow-md shadow-emerald-500/40"
                  : isWrong
                    ? "bg-slate-300"
                    : "bg-emerald-100 hover:bg-emerald-200 active:scale-95"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
