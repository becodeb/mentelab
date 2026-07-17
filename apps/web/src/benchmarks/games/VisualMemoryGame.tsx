"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { VisualMemoryConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";
import { CheckIcon, HeartIcon, XIcon } from "@/components/icons";

function gridSizeFor(level: number): number {
  if (level <= 2) return 3;
  if (level <= 5) return 4;
  if (level <= 9) return 5;
  return 6;
}

type Phase = "showing" | "input" | "levelDone" | "lifeLost";

export function VisualMemoryGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as VisualMemoryConfig;
  const [level, setLevel] = useState(cfg.startLevel);
  const [lives, setLives] = useState(cfg.lives);
  const [pattern, setPattern] = useState<Set<number>>(new Set());
  const [found, setFound] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>("showing");
  const [shake, setShake] = useState(0);
  const lastClickAtRef = useRef(0);
  const wrongInLevelRef = useRef(0);
  const finishingRef = useRef(false);

  const grid = gridSizeFor(level);
  const cells = grid * grid;
  const tileCount = Math.min(level + 2, cells - 1);

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
      sfx.flip();
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
      // La casilla acertada QUEDA marcada hasta terminar el nivel.
      sfx.note(found.size);
      const nf = new Set(found).add(i);
      setFound(nf);
      if (nf.size >= pattern.size) {
        sfx.success();
        emit("level_complete", { level });
        setPhase("levelDone");
        setTimeout(() => setLevel((l) => l + 1), 850);
      }
      return;
    }

    // Error: marca visible con X, sacudida del tablero y sonido grave.
    sfx.error();
    setWrong(new Set(wrong).add(i));
    setShake((s) => s + 1);
    wrongInLevelRef.current++;
    if (wrongInLevelRef.current >= 3) {
      emit("life_lost", { level, livesLeft: lives - 1 });
      if (lives - 1 <= 0) {
        finishingRef.current = true;
        setPhase("lifeLost");
        setTimeout(finish, 700);
      } else {
        setLives(lives - 1);
        setPhase("lifeLost");
        setTimeout(() => showPattern(level), 900);
      }
    }
  };

  const statusLine: Record<Phase, string> = {
    showing: "Memorizá las casillas encendidas",
    input: `Encontrá las ${tileCount} casillas — llevás ${found.size}`,
    levelDone: "¡Nivel superado!",
    lifeLost: "Uy… perdiste una vida",
  };

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-cream-50 p-6">
      <div className="flex items-center gap-6">
        <p className="font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
          nivel {level}
        </p>
        <div className="flex gap-1.5" aria-label={`${lives} vidas`}>
          {Array.from({ length: cfg.lives }, (_, i) => (
            <HeartIcon
              key={i}
              filled={i < lives}
              className={`h-5 w-5 ${i < lives ? "text-rose-500" : "text-cream-300"}`}
            />
          ))}
        </div>
      </div>
      <p
        className={`mt-2 h-8 font-display text-2xl font-semibold ${
          phase === "lifeLost" ? "text-rose-600" : phase === "levelDone" ? "text-emerald-600" : "text-ink-700"
        }`}
      >
        {statusLine[phase]}
      </p>

      <motion.div
        key={shake}
        animate={shake > 0 ? { x: [0, -12, 12, -7, 7, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="mt-6 rounded-[2rem] border border-ink-900/10 bg-[#fffdf6] p-4 shadow-[0_10px_40px_-16px_rgba(32,27,18,0.25)]"
      >
        <div
          className="grid gap-2.5"
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
                className={`relative flex aspect-square w-16 items-center justify-center rounded-2xl transition-all duration-150 sm:w-[4.5rem] ${
                  lit || isFound
                    ? "scale-[1.03] bg-ink-900 shadow-[0_6px_18px_-6px_rgba(32,27,18,0.5)]"
                    : isWrong
                      ? "bg-rose-100"
                      : "border-2 border-ink-900/10 bg-cream-100 hover:bg-cream-200 active:scale-95"
                }`}
              >
                {isFound && <CheckIcon className="h-7 w-7 text-cream-50" />}
                {isWrong && <XIcon className="h-6 w-6 text-rose-500" />}
              </button>
            );
          })}
        </div>
      </motion.div>
      <p className="mt-4 text-sm font-semibold text-ink-300">
        3 errores en un nivel = una vida menos
      </p>
    </div>
  );
}
