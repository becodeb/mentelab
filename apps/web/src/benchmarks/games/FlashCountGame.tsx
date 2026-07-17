"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { FlashCountConfig } from "@mentelab/benchmarks";
import type { GameProps } from "../shell/types";
import { sfx } from "@/lib/sfx";

interface Dot {
  xPct: number;
  yPct: number;
}
type Phase = "flash" | "answer" | "reveal";

/** ¿CUÁNTOS HAY? (subitizing): puntos que desaparecen; elegí la cantidad. */
export function FlashCountGame({ config, emit, now, finish }: GameProps) {
  const cfg = config as FlashCountConfig;
  const [round, setRound] = useState(1);
  const [dots, setDots] = useState<Dot[]>([]);
  const [phase, setPhase] = useState<Phase>("flash");
  const [options, setOptions] = useState<number[]>([]);
  const [lastCorrect, setLastCorrect] = useState(true);
  const [score, setScore] = useState(0);
  const countRef = useRef(0);
  const shownAtRef = useRef(0);

  const newRound = useCallback(() => {
    const count = 2 + Math.floor(Math.random() * (cfg.maxDots - 1));
    countRef.current = count;
    const placed: Dot[] = [];
    for (let i = 0; i < count; i++) {
      let x = 0,
        y = 0,
        tries = 0;
      do {
        x = 15 + Math.random() * 70;
        y = 15 + Math.random() * 70;
        tries++;
      } while (tries < 50 && placed.some((p) => Math.hypot(p.xPct - x, p.yPct - y) < 18));
      placed.push({ xPct: x, yPct: y });
    }
    setDots(placed);
    setPhase("flash");
    // Opciones: la correcta ± vecinas, mezcladas.
    const opts = new Set<number>([count]);
    while (opts.size < 3) {
      const delta = Math.random() < 0.5 ? -1 : 1;
      const candidate = count + delta * (1 + Math.floor(Math.random() * 2));
      if (candidate >= 1) opts.add(candidate);
    }
    setOptions([...opts].sort((a, b) => a - b));
    emit("dots_shown", { round, dots: count });
    sfx.flip();
    setTimeout(() => {
      shownAtRef.current = now();
      setPhase("answer");
    }, cfg.flashMs);
  }, [cfg.maxDots, cfg.flashMs, emit, now, round]);

  useEffect(() => {
    newRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const answer = (value: number) => {
    if (phase !== "answer") return;
    const correct = value === countRef.current;
    emit("count_answer", {
      round,
      dots: countRef.current,
      answer: value,
      correct,
      ms: Math.round(now() - shownAtRef.current),
    });
    if (correct) {
      sfx.success();
      setScore((s) => s + 1);
    } else {
      sfx.error();
    }
    setLastCorrect(correct);
    setPhase("reveal");
    setTimeout(() => {
      if (round >= cfg.rounds) finish();
      else setRound((r) => r + 1);
    }, 800);
  };

  return (
    <div className="flex min-h-dvh select-none flex-col items-center justify-center bg-cream-50 p-6">
      <div className="flex items-center gap-8 font-display text-sm font-bold uppercase tracking-[0.25em] text-ink-400">
        <span>
          ronda {round} de {cfg.rounds}
        </span>
        <span className="text-ink-700">{score} aciertos</span>
      </div>

      {/* Zona de puntos */}
      <div className="relative mt-6 h-72 w-full max-w-md rounded-[2rem] border border-ink-900/10 bg-[#fffdf6] shadow-[0_10px_40px_-16px_rgba(32,27,18,0.25)]">
        {phase === "flash" &&
          dots.map((d, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600"
              style={{ left: `${d.xPct}%`, top: `${d.yPct}%` }}
            />
          ))}
        {phase === "answer" && (
          <p className="absolute inset-0 flex items-center justify-center font-display text-3xl font-semibold text-ink-300">
            ¿Cuántos eran?
          </p>
        )}
        {phase === "reveal" && (
          <p
            className={`absolute inset-0 flex items-center justify-center font-display text-5xl font-bold ${
              lastCorrect ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {lastCorrect ? "¡Sí!" : `Eran ${countRef.current}`}
          </p>
        )}
      </div>

      <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            onPointerDown={() => answer(opt)}
            disabled={phase !== "answer"}
            className="rounded-[1.5rem] border-2 border-ink-900/12 bg-[#fffdf6] py-5 font-display text-4xl font-bold text-ink-900 shadow-[0_8px_24px_-10px_rgba(32,27,18,0.3)] transition-all hover:-translate-y-1 hover:border-ink-900 active:scale-95 disabled:opacity-40"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
